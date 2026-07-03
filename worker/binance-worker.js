'use strict'

// Worker Binance — clé API en LECTURE SEULE (HMAC-SHA256).
// Modèle IBKR : l'utilisateur fournit une clé API + secret (droits lecture uniquement).
// Ce worker signe les requêtes REST côté serveur, lit les trades récents via
// GET /api/v3/myTrades (par symbole) et les poste vers /api/ingest. Aucun logiciel chez
// l'utilisateur, aucun ordre passé. À déployer comme les autres workers Node (Railway).
//
// Les paires suivies viennent du champ `symbols` (CSV). Si vide, on les déduit des soldes
// non nuls du compte (asset + USDT) — heuristique ; le user peut préciser ses paires pour
// un suivi exact. Le P&L réalisé du spot (FIFO) n'est pas reconstruit ici : chaque fill est
// posté tel quel (pnl 0) → seuls les détecteurs d'ENTRÉE s'appliquent pour l'instant.

const { createClient } = require('@supabase/supabase-js')
const { createDecipheriv, createHash, createHmac } = require('crypto')

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
  BINANCE_BASE = 'https://api.binance.com',
} = process.env

const POLL_MS = 30_000
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Déchiffre un secret (AES-256-GCM, schéma identique à lib/secretCrypto.ts).
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

// Requête signée Binance (HMAC-SHA256 sur la query string).
async function signed(path, params, apiKey, apiSecret) {
  const qs = new URLSearchParams({ ...params, timestamp: Date.now().toString(), recvWindow: '10000' }).toString()
  const sig = createHmac('sha256', apiSecret).update(qs).digest('hex')
  const r = await fetch(`${BINANCE_BASE}${path}?${qs}&signature=${sig}`, { headers: { 'X-MBX-APIKEY': apiKey } })
  const text = await r.text()
  let json = null; try { json = JSON.parse(text) } catch {}
  return { ok: r.ok, status: r.status, json, text }
}

// -2014/-2015 = clé API invalide / permissions insuffisantes ; -1022 = signature ; 401.
function isAuthFail(res) {
  const c = res.json && res.json.code
  return res.status === 401 || c === -2014 || c === -2015 || c === -1022
}

const STABLES = new Set(['USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'DAI', 'EUR', 'USD', 'TRY', 'GBP'])

// Déduit des paires candidates depuis les soldes non nuls (asset non-stable + USDT).
async function deriveSymbols(apiKey, apiSecret) {
  const res = await signed('/api/v3/account', {}, apiKey, apiSecret)
  if (!res.ok || !res.json || !Array.isArray(res.json.balances)) return { symbols: [], res }
  const symbols = res.json.balances
    .filter(b => (parseFloat(b.free) + parseFloat(b.locked)) > 0 && !STABLES.has(b.asset))
    .map(b => `${b.asset}USDT`)
  return { symbols, res }
}

async function setStatus(id, status) {
  await supabase.from('binance_accounts').update({ status, last_sync_at: new Date().toISOString() }).eq('id', id)
}

async function pollAccount(row) {
  let apiKey, apiSecret
  try {
    apiKey = decryptSecret(row.api_key_enc)
    apiSecret = decryptSecret(row.api_secret_enc)
  } catch (e) {
    await setStatus(row.id, 'error')
    console.error('[binance] déchiffrement', e && e.message)
    return
  }

  let symbols = (row.symbols || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!symbols.length) {
    const d = await deriveSymbols(apiKey, apiSecret)
    if (!d.res.ok) {
      await setStatus(row.id, isAuthFail(d.res) ? 'auth_failed' : 'error')
      return
    }
    symbols = d.symbols
    if (!symbols.length) {
      // Clé valide mais aucun actif → connecté, rien à ingérer pour l'instant.
      await setStatus(row.id, 'connected')
      return
    }
  }

  const since = row.last_trade_at ? Date.parse(row.last_trade_at) : 0
  let maxTs = since
  let posted = 0
  let anyOk = false
  let authFailed = false

  for (const symbol of symbols) {
    const res = await signed('/api/v3/myTrades', {
      symbol, limit: '500', ...(since ? { startTime: (since + 1).toString() } : {}),
    }, apiKey, apiSecret)

    if (!res.ok) {
      if (isAuthFail(res)) authFailed = true
      // -1121 = symbole invalide (paire inexistante) → on ignore ce symbole.
      continue
    }
    anyOk = true
    const trades = Array.isArray(res.json) ? res.json : []
    trades.sort((a, b) => a.time - b.time)

    for (const t of trades) {
      if (t.time <= since) continue   // déjà ingéré
      const price = parseFloat(t.price) || null
      const payload = {
        symbol: t.symbol,
        direction: t.isBuyer ? 'long' : 'short',
        size: Math.abs(parseFloat(t.qty) || 0),
        entry_price: price,
        exit_price: price,      // spot = 1 fill ; P&L FIFO reconstructible plus tard
        entry_time: new Date(t.time).toISOString(),
        exit_time: new Date(t.time).toISOString(),
        pnl: 0,
      }
      try {
        const r = await fetch(CALDRA_INGEST_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-caldra-key': row.ingest_key },
          body: JSON.stringify(payload),
        })
        if (r.ok) { posted++; if (t.time > maxTs) maxTs = t.time }
        else console.error('[binance] ingest échec', r.status, await r.text())
      } catch (e) { console.error('[binance] ingest réseau', e && e.message) }
    }
  }

  const status = authFailed && !anyOk ? 'auth_failed' : anyOk ? 'connected' : 'error'
  await supabase.from('binance_accounts').update({
    status,
    last_sync_at: new Date().toISOString(),
    ...(maxTs > since ? { last_trade_at: new Date(maxTs).toISOString() } : {}),
  }).eq('id', row.id)
  if (posted) console.log(`[binance] ${row.user_id} : ${posted} trade(s) ingéré(s)`)
}

async function tick() {
  const { data, error } = await supabase.from('binance_accounts').select('*')
  if (error) { console.error('[binance] lecture DB', error.message); return }
  for (const row of data || []) {
    try { await pollAccount(row) } catch (e) { console.error('[binance] pollAccount', e && e.message) }
  }
}

console.log('[binance] worker démarré, poll', POLL_MS / 1000, 's')
tick()
setInterval(tick, POLL_MS)
