'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// Caldra — Worker d'ingestion FUTURES via Tradovate (REST polling)
//
// Même rôle que ctrader-worker.js : process Node autonome (Railway), lit les
// trades fermés chez le broker et les POST vers /api/ingest. Indépendant de Next.
//
// Choix REST polling (vs WebSocket protobuf cTrader) : Tradovate expose une API
// REST simple ; les fillPair (aller-retours appariés) suffisent à reconstruire un
// trade fermé. La dédup est gérée côté /api/ingest (signature symbol+direction+
// entry_time+exit_time) → on peut re-poster sans gonfler les compteurs.
//
// ⚠️ Les champs marqués « VÉRIFIER » doivent être confirmés sur un vrai compte
//    Tradovate (schéma fillPair / contract / product). Tant que ce n'est pas
//    validé, garder ce worker en environnement demo.
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js')

// Charge .env si présent (exécution locale)
try {
  require('fs').readFileSync('.env', 'utf8').split('\n').forEach(l => {
    const eq = l.indexOf('=')
    if (eq > 0) process.env[l.slice(0, eq).trim()] = l.slice(eq + 1).trim()
  })
} catch {}

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  // Domaine Vercel direct (PAS getcaldra.com derrière Cloudflare Bot Fight Mode).
  CALDRA_INGEST_URL = 'https://caldra-sable.vercel.app/api/ingest',
  // live | demo — base REST Tradovate. Démo le temps de valider le mapping.
  TRADOVATE_ENV = 'demo',
} = process.env

const REST_BASE = {
  live: 'https://live.tradovateapi.com/v1',
  demo: 'https://demo.tradovateapi.com/v1',
}[TRADOVATE_ENV] || 'https://demo.tradovateapi.com/v1'

const POLL_MS = 15_000
const TOKEN_RENEW_BUFFER_MS = 10 * 60_000   // renouvelle le token 10 min avant expiration

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// État en mémoire par user
const processedPairs = new Set()      // `${userId}:${fillPairId}` déjà ingérés cette session
const contractCache  = new Map()      // contractId -> { name, valuePerPoint }
let   noAccountsLogged = false

// ── Helpers REST ─────────────────────────────────────────────────────────────
async function tvGet(token, path) {
  const r = await fetch(`${REST_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`GET ${path} → ${r.status} ${await r.text()}`)
  return r.json()
}

// Renouvelle un access_token encore valide (Tradovate ne fournit pas de refresh_token
// OAuth long ; on prolonge via renewAccessToken tant que le token n'est pas expiré).
async function renewToken(row) {
  try {
    const r = await fetch(`${REST_BASE}/auth/renewAccessToken`, {
      headers: { Authorization: `Bearer ${row.access_token}`, Accept: 'application/json' },
    })
    if (!r.ok) { console.error('[tradovate] renew échec', r.status); return null }
    const json = await r.json()
    const accessToken = json.accessToken ?? json.access_token        // VÉRIFIER nom exact
    const expIso = json.expirationTime
      ?? (json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : null)
    if (!accessToken) return null
    await supabase.from('tradovate_accounts')
      .update({ access_token: accessToken, token_expires_at: expIso })
      .eq('user_id', row.user_id)
    console.log(`[tradovate] token renouvelé (user ${row.user_id.slice(0, 8)})`)
    return { ...row, access_token: accessToken, token_expires_at: expIso }
  } catch (e) {
    console.error('[tradovate] renew erreur', e?.message)
    return null
  }
}

async function ensureFreshToken(row) {
  const exp = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0
  if (exp > 0 && exp - Date.now() < TOKEN_RENEW_BUFFER_MS) {
    return (await renewToken(row)) || row
  }
  return row
}

// Multiplicateur de point d'un contrat (NQ = 20$/pt, ES = 50$/pt) → calcule le P&L.
async function getContract(token, contractId) {
  if (contractCache.has(contractId)) return contractCache.get(contractId)
  // VÉRIFIER : /contract/item?id= renvoie { name, productId } ; le valuePerPoint
  // vit sur le product (/product/item?id=) champ `valuePerPoint`.
  const c = await tvGet(token, `/contract/item?id=${contractId}`)
  let valuePerPoint = null
  try {
    const p = await tvGet(token, `/product/item?id=${c.productId}`)
    valuePerPoint = Number(p.valuePerPoint) || null
  } catch {}
  const info = { name: c.name || String(contractId), valuePerPoint }
  contractCache.set(contractId, info)
  return info
}

// Reconstruit un trade fermé à partir d'un fillPair (aller-retour buy/sell apparié).
// VÉRIFIER les noms de champs fillPair contre un vrai compte.
async function normalizeFillPair(token, accountId, pair) {
  // fillPair (schéma documenté) : { id, positionId, buyFillId, sellFillId, qty,
  // buyPrice, sellPrice, timestamp, contractId? }. La date d'entrée/sortie et le
  // sens (long/short) se déduisent de l'ordre chronologique des deux fills.
  const [buyFill, sellFill] = await Promise.all([
    tvGet(token, `/fill/item?id=${pair.buyFillId}`).catch(() => null),
    tvGet(token, `/fill/item?id=${pair.sellFillId}`).catch(() => null),
  ])
  if (!buyFill || !sellFill) return null

  const buyTs  = new Date(buyFill.timestamp).getTime()
  const sellTs = new Date(sellFill.timestamp).getTime()
  // Achat avant vente = position longue ; vente avant achat = position short.
  const isLong     = buyTs <= sellTs
  const direction  = isLong ? 'long' : 'short'
  const entryFill  = isLong ? buyFill : sellFill
  const exitFill   = isLong ? sellFill : buyFill
  const entry_time = new Date(entryFill.timestamp).toISOString()
  const exit_time  = new Date(exitFill.timestamp).toISOString()

  const contractId = pair.contractId ?? buyFill.contractId
  const { name, valuePerPoint } = await getContract(token, contractId)
  const qty = Number(pair.qty) || Number(buyFill.qty) || 0
  // P&L réalisé = (sortie − entrée) × sens × qty × valeur du point.
  const priceDelta = (Number(pair.sellPrice) - Number(pair.buyPrice))
  const pnl = valuePerPoint ? priceDelta * qty * valuePerPoint : null

  return {
    symbol:      String(name).replace(/[^A-Za-z0-9./_-]/g, '').slice(0, 20),  // ex. NQM6 → root géré côté UI
    direction,
    size:        qty,
    entry_price: Number(entryFill.price) || Number(isLong ? pair.buyPrice : pair.sellPrice) || null,
    exit_price:  Number(exitFill.price)  || Number(isLong ? pair.sellPrice : pair.buyPrice) || null,
    entry_time,
    exit_time,
    pnl,
    stop_loss:   null,   // Tradovate : le stop vit sur l'ordre OSO ; non capturé en v1.
  }
}

async function postIngest(ingestKey, payload, env) {
  try {
    const r = await fetch(CALDRA_INGEST_URL, {
      method:  'POST',
      headers: { 'content-type': 'application/json', 'x-caldra-key': ingestKey },
      body:    JSON.stringify(payload),
    })
    if (!r.ok) console.error('[ingest] échec', r.status, await r.text())
    else console.log(`[ingest:${env}] ${payload.symbol} ${payload.direction} pnl=${payload.pnl}`)
  } catch (e) {
    console.error('[ingest] erreur réseau', e?.message)
  }
}

// ── Boucle de poll par compte ────────────────────────────────────────────────
async function pollAccount(row) {
  row = await ensureFreshToken(row)
  const token = row.access_token

  // Résout l'accountId si pas encore fait (le callback écrit un placeholder null).
  let accountId = row.tradovate_account_id
  if (!accountId) {
    const accounts = await tvGet(token, '/account/list')        // comptes du token
    const acc = (accounts || [])[0]
    if (!acc) { console.log(`[tradovate] aucun compte pour user ${row.user_id.slice(0, 8)}`); return }
    accountId = acc.id
    await supabase.from('tradovate_accounts')
      .update({ tradovate_account_id: accountId, tradovate_user_id: acc.userId ?? null, status: 'connected' })
      .eq('user_id', row.user_id).is('tradovate_account_id', null)
    console.log(`[tradovate] compte ${accountId} résolu (user ${row.user_id.slice(0, 8)})`)
  }

  // fillPairs du compte. VÉRIFIER : /fillPair/deps?masterid=<accountId> ou /fillPair/list.
  let pairs = []
  try {
    pairs = await tvGet(token, `/fillPair/deps?masterid=${accountId}`)
  } catch {
    pairs = await tvGet(token, '/fillPair/list').catch(() => [])
  }

  for (const pair of pairs || []) {
    const key = `${row.user_id}:${pair.id}`
    if (processedPairs.has(key)) continue
    processedPairs.add(key)
    try {
      const payload = await normalizeFillPair(token, accountId, pair)
      if (payload && payload.entry_price && payload.exit_price) {
        await postIngest(row.ingest_key, payload, TRADOVATE_ENV)
      }
    } catch (e) {
      console.error('[tradovate] normalize/ingest', pair.id, e?.message)
      processedPairs.delete(key)   // on réessaiera au prochain tick
    }
  }
}

async function loop() {
  const { data, error } = await supabase
    .from('tradovate_accounts')
    .select('user_id, access_token, token_expires_at, ingest_key, tradovate_account_id')
  if (error) { console.error('[supabase]', error.message); return }

  if (!data || data.length === 0) {
    if (!noAccountsLogged) { console.log('[tradovate] aucune ligne tradovate_accounts — en attente de connexion OAuth'); noAccountsLogged = true }
    return
  }
  noAccountsLogged = false

  for (const row of data) {
    try { await pollAccount(row) }
    catch (e) { console.error('[tradovate] poll', row.user_id.slice(0, 8), e?.message) }
  }
}

console.log(`[tradovate] worker démarré (env=${TRADOVATE_ENV}, base=${REST_BASE})`)
loop().catch(e => console.error('[tradovate] fatal', e?.message))
setInterval(() => loop().catch(e => console.error('[tradovate] loop', e?.message)), POLL_MS)
