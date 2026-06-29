'use strict'

// Worker TradeStation — OAuth (modèle cTrader). Rafraîchit le token, résout les comptes,
// récupère les ordres exécutés (historicalorders) et les poste vers /api/ingest.
// Note v1 : TradeStation ne renvoie pas de P&L réalisé par ordre → on poste les exécutions
// comme entrées (les détecteurs d'entrée marchent ; le P&L réalisé est à affiner ensuite).
// À déployer comme les autres workers. Nécessite TRADESTATION_CLIENT_ID/SECRET.

const { createClient } = require('@supabase/supabase-js')
const { createCipheriv, createDecipheriv, createHash, randomBytes } = require('crypto')

try {
  require('fs').readFileSync('.env', 'utf8').split('\n').forEach(l => {
    const eq = l.indexOf('='); if (eq > 0) process.env[l.slice(0, eq).trim()] = l.slice(eq + 1).trim()
  })
} catch {}

const {
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MT5_ENC_KEY,
  TRADESTATION_CLIENT_ID, TRADESTATION_CLIENT_SECRET,
  TRADESTATION_API_BASE = 'https://api.tradestation.com/v3',
  CALDRA_INGEST_URL = 'https://caldra-sable.vercel.app/api/ingest',
} = process.env

const POLL_MS = 30_000
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function encKey() { return createHash('sha256').update(MT5_ENC_KEY).digest() }
function encryptSecret(plaintext) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', encKey(), iv)
  const enc = Buffer.concat([c.update(plaintext, 'utf8'), c.final()])
  return Buffer.concat([iv, enc, c.getAuthTag()]).toString('base64')
}
function decryptSecret(b64) {
  const data = Buffer.from(b64, 'base64')
  const d = createDecipheriv('aes-256-gcm', encKey(), data.subarray(0, 12))
  d.setAuthTag(data.subarray(data.length - 16))
  return Buffer.concat([d.update(data.subarray(12, data.length - 16)), d.final()]).toString('utf8')
}

// Rafraîchit l'access token si expiré/proche expiration ; renvoie un token valide ou null.
async function freshAccessToken(row) {
  const exp = row.token_expires_at ? Date.parse(row.token_expires_at) : 0
  if (exp - Date.now() > 120_000) return decryptSecret(row.access_token_enc)   // encore valide
  if (!row.refresh_token_enc) return null
  const res = await fetch('https://signin.tradestation.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: TRADESTATION_CLIENT_ID,
      client_secret: TRADESTATION_CLIENT_SECRET,
      refresh_token: decryptSecret(row.refresh_token_enc),
    }),
  })
  const j = await res.json().catch(() => ({}))
  if (!j.access_token) { console.error('[ts] refresh échec', res.status, JSON.stringify(j)); return null }
  await supabase.from('tradestation_accounts').update({
    access_token_enc: encryptSecret(j.access_token),
    ...(j.refresh_token ? { refresh_token_enc: encryptSecret(j.refresh_token) } : {}),
    token_expires_at: new Date(Date.now() + (j.expires_in ?? 1200) * 1000).toISOString(),
  }).eq('id', row.id)
  return j.access_token
}

async function api(path, token) {
  const r = await fetch(`${TRADESTATION_API_BASE}${path}`, { headers: { authorization: `Bearer ${token}` } })
  if (r.status === 401) return { unauthorized: true }
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) }
}

async function pollAccount(row) {
  const token = await freshAccessToken(row)
  if (!token) {
    await supabase.from('tradestation_accounts').update({ status: 'auth_failed', last_sync_at: new Date().toISOString() }).eq('id', row.id)
    return
  }

  // Résout les comptes une fois.
  let accountIds = row.account_ids
  if (!accountIds) {
    const acc = await api('/brokerage/accounts', token)
    if (acc.unauthorized) { await supabase.from('tradestation_accounts').update({ status: 'auth_failed' }).eq('id', row.id); return }
    accountIds = (acc.json?.Accounts || []).map(a => a.AccountID).join(',')
    if (accountIds) await supabase.from('tradestation_accounts').update({ account_ids: accountIds }).eq('id', row.id)
  }
  if (!accountIds) { await supabase.from('tradestation_accounts').update({ status: 'error', last_sync_at: new Date().toISOString() }).eq('id', row.id); return }

  // Ordres historiques (exécutés) depuis ~3 jours ; on filtre ensuite sur last_order_at.
  const since = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
  const ho = await api(`/brokerage/accounts/${accountIds}/historicalorders?since=${since}`, token)
  if (ho.unauthorized) { await supabase.from('tradestation_accounts').update({ status: 'auth_failed' }).eq('id', row.id); return }

  const lastTs = row.last_order_at ? Date.parse(row.last_order_at) : 0
  let maxTs = lastTs, posted = 0
  const orders = (ho.json?.Orders || [])
    .filter(o => (o.Status === 'FLL' || o.StatusDescription === 'Filled'))
    .map(o => ({ ...o, ts: Date.parse(o.ClosedDateTime || o.OpenedDateTime || 0) }))
    .filter(o => o.ts && o.ts > lastTs)
    .sort((a, b) => a.ts - b.ts)

  for (const o of orders) {
    for (const leg of (o.Legs || [])) {
      const side = String(leg.BuyOrSell || '').toLowerCase()
      const dir = side.includes('sell') ? 'short' : 'long'   // Sell / SellShort → short
      const size = Math.abs(parseFloat(leg.ExecQuantity || leg.QuantityOrdered || '0'))
      const price = parseFloat(leg.ExecutionPrice || '0') || null
      if (!leg.Symbol || size <= 0) continue
      const payload = {
        symbol: leg.Symbol, direction: dir, size,
        entry_price: price, entry_time: new Date(o.ts).toISOString(),
      }
      try {
        const r = await fetch(CALDRA_INGEST_URL, {
          method: 'POST', headers: { 'content-type': 'application/json', 'x-caldra-key': row.ingest_key },
          body: JSON.stringify(payload),
        })
        if (r.ok) posted++
        else console.error('[ts] ingest échec', r.status, await r.text())
      } catch (e) { console.error('[ts] ingest réseau', e?.message) }
    }
    if (o.ts > maxTs) maxTs = o.ts
  }

  await supabase.from('tradestation_accounts').update({
    status: 'connected', last_sync_at: new Date().toISOString(),
    ...(maxTs > lastTs ? { last_order_at: new Date(maxTs).toISOString() } : {}),
  }).eq('id', row.id)
  if (posted) console.log(`[ts] ${row.user_id} : ${posted} exécution(s) ingérée(s)`)
}

async function tick() {
  const { data, error } = await supabase.from('tradestation_accounts').select('*')
  if (error) { console.error('[ts] lecture DB', error.message); return }
  for (const row of data || []) {
    try { await pollAccount(row) } catch (e) { console.error('[ts] pollAccount', e?.message) }
  }
}

console.log('[ts] worker démarré, poll', POLL_MS / 1000, 's')
tick()
setInterval(tick, POLL_MS)
