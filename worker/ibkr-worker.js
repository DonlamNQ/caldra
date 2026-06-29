'use strict'

// Worker Interactive Brokers — Flex Web Service.
// Modèle MT5 : l'utilisateur fournit un token Flex (lecture seule) + l'ID de sa requête
// « Trade Confirmation Flex ». Ce worker interroge IBKR côté serveur (2 étapes : SendRequest
// → ReferenceCode → GetStatement → XML), parse les exécutions et les poste vers /api/ingest.
// Gratuit, aucun logiciel chez l'utilisateur. À déployer comme les autres workers (VPS/Railway).

const { createClient } = require('@supabase/supabase-js')
const { createDecipheriv, createHash } = require('crypto')

// Charge .env si présent (exécution locale).
try {
  require('fs').readFileSync('.env', 'utf8').split('\n').forEach(l => {
    const eq = l.indexOf('=')
    if (eq > 0) process.env[l.slice(0, eq).trim()] = l.slice(eq + 1).trim()
  })
} catch {}

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MT5_ENC_KEY,   // même clé de chiffrement que Vercel (réutilisée par lib/secretCrypto.ts)
  CALDRA_INGEST_URL = 'https://caldra-sable.vercel.app/api/ingest',
} = process.env

const POLL_MS = 30_000
const FLEX_BASE = 'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Déchiffre le token Flex (AES-256-GCM, schéma identique à lib/secretCrypto.ts).
function decryptSecret(b64) {
  const key = createHash('sha256').update(MT5_ENC_KEY).digest()
  const data = Buffer.from(b64, 'base64')
  const iv = data.subarray(0, 12)
  const tag = data.subarray(data.length - 16)
  const ct = data.subarray(12, data.length - 16)
  const d = createDecipheriv('aes-256-gcm', key, iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8')
}

const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`, 'i')); return m ? m[1].trim() : null }
const attr = (el, name) => { const m = el.match(new RegExp(`${name}="([^"]*)"`, 'i')); return m ? m[1] : null }

// IBKR Flex dateTime → ISO. Gère "YYYYMMDD;HHMMSS", "YYYYMMDD HHMMSS", "YYYY-MM-DD HH:MM:SS".
function parseFlexDate(s) {
  if (!s) return null
  const digits = s.replace(/[^0-9]/g, '')
  if (digits.length >= 14) {
    const [y, mo, d, h, mi, se] = [digits.slice(0,4), digits.slice(4,6), digits.slice(6,8), digits.slice(8,10), digits.slice(10,12), digits.slice(12,14)]
    return `${y}-${mo}-${d}T${h}:${mi}:${se}Z`
  }
  if (digits.length === 8) return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}T00:00:00Z`
  const t = Date.parse(s)
  return isNaN(t) ? null : new Date(t).toISOString()
}

// Étape 1 : SendRequest → ReferenceCode (ou erreur token/requête).
async function sendRequest(token, queryId) {
  const r = await fetch(`${FLEX_BASE}/SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=3`)
  const xml = await r.text()
  const status = tag(xml, 'Status')
  if (status !== 'Success') {
    const err = tag(xml, 'ErrorMessage') || tag(xml, 'ErrorCode') || 'inconnue'
    return { error: err }
  }
  return { ref: tag(xml, 'ReferenceCode'), url: tag(xml, 'Url') || `${FLEX_BASE}/GetStatement` }
}

// Étape 2 : GetStatement → XML du rapport (peut renvoyer "generation in progress").
async function getStatement(url, token, ref) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${url}?t=${encodeURIComponent(token)}&q=${encodeURIComponent(ref)}&v=3`)
    const xml = await r.text()
    if (xml.includes('<code>1019</code>') || /generation.*in progress/i.test(xml)) {
      await new Promise(res => setTimeout(res, 2000)); continue
    }
    return xml
  }
  return null
}

async function pollAccount(row) {
  const token = decryptSecret(row.flex_token_enc)
  const sent = await sendRequest(token, row.flex_query_id)
  if (sent.error) {
    const bad = /invalid|token|expired|not allowed|denied/i.test(sent.error)
    await supabase.from('ibkr_accounts').update({ status: bad ? 'auth_failed' : 'error', last_sync_at: new Date().toISOString() }).eq('id', row.id)
    console.error(`[ibkr] ${row.user_id} SendRequest échec: ${sent.error}`)
    return
  }
  const xml = await getStatement(sent.url, token, sent.ref)
  if (!xml) { console.error(`[ibkr] ${row.user_id} statement indisponible`); return }

  // Exécutions = éléments <TradeConfirm .../> (requête « Trade Confirmation Flex »).
  const confirms = xml.match(/<TradeConfirm\b[^>]*\/?>/gi) || []
  const since = row.last_trade_at ? Date.parse(row.last_trade_at) : 0
  let maxTs = since
  let posted = 0

  // Ordre chronologique pour respecter la séquence des trades (consécutifs, etc.).
  const parsed = confirms.map(el => {
    const dt = parseFlexDate(attr(el, 'dateTime') || attr(el, 'tradeDate'))
    return {
      ts: dt ? Date.parse(dt) : 0, dt,
      symbol: attr(el, 'symbol') || attr(el, 'underlyingSymbol') || '?',
      side: (attr(el, 'buySell') || '').toUpperCase(),
      qty: Math.abs(parseFloat(attr(el, 'quantity') || '0')),
      price: parseFloat(attr(el, 'price') || attr(el, 'tradePrice') || '0') || null,
      pnl: parseFloat(attr(el, 'fifoPnlRealized') || '0') || 0,
    }
  }).filter(t => t.dt && t.qty > 0).sort((a, b) => a.ts - b.ts)

  for (const t of parsed) {
    if (t.ts <= since) continue   // déjà ingéré
    const payload = {
      symbol: t.symbol,
      direction: t.side === 'SELL' ? 'short' : 'long',
      size: t.qty,
      entry_price: t.price,
      exit_price: t.price,      // une exécution Flex = un fill ; pnl réalisé porté ci-dessous
      entry_time: t.dt,
      exit_time: t.dt,
      pnl: t.pnl,
    }
    try {
      const r = await fetch(CALDRA_INGEST_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-caldra-key': row.ingest_key },
        body: JSON.stringify(payload),
      })
      if (r.ok) { posted++; if (t.ts > maxTs) maxTs = t.ts }
      else console.error('[ibkr] ingest échec', r.status, await r.text())
    } catch (e) { console.error('[ibkr] ingest réseau', e?.message) }
  }

  await supabase.from('ibkr_accounts').update({
    status: 'connected',
    last_sync_at: new Date().toISOString(),
    ...(maxTs > since ? { last_trade_at: new Date(maxTs).toISOString() } : {}),
  }).eq('id', row.id)
  if (posted) console.log(`[ibkr] ${row.user_id} : ${posted} trade(s) ingéré(s)`)
}

async function tick() {
  const { data, error } = await supabase.from('ibkr_accounts').select('*')
  if (error) { console.error('[ibkr] lecture DB', error.message); return }
  for (const row of data || []) {
    try { await pollAccount(row) } catch (e) { console.error('[ibkr] pollAccount', e?.message) }
  }
}

console.log('[ibkr] worker démarré, poll', POLL_MS / 1000, 's')
tick()
setInterval(tick, POLL_MS)
