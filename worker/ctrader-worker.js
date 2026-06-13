'use strict'

const { CTraderConnection } = require('@reiryoku/ctrader-layer')
const { createClient }      = require('@supabase/supabase-js')

// Charge .env si présent (exécution locale)
try {
  require('fs').readFileSync('.env', 'utf8').split('\n').forEach(l => {
    const eq = l.indexOf('=')
    if (eq > 0) process.env[l.slice(0, eq).trim()] = l.slice(eq + 1).trim()
  })
} catch {}

const {
  CTRADER_CLIENT_ID,
  CTRADER_CLIENT_SECRET,
  CTRADER_ENV           = 'live',
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  CALDRA_INGEST_URL     = 'https://getcaldra.com/api/ingest',
} = process.env

const HOST         = CTRADER_ENV === 'demo' ? 'demo.ctraderapi.com' : 'live.ctraderapi.com'
const PORT         = 5035
const HEARTBEAT_MS = 10_000
const TOKEN_REFRESH_BUFFER_MS = 10 * 60_000   // rafraîchit le token 10 min avant expiration

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

let connection     = null
const authed       = new Map()   // ctid -> { userId, ingestKey }
const symbolNames  = new Map()   // `${ctid}:${symbolId}` -> 'EURUSD'
const openPositions = new Map()  // positionId -> { entry_time }
const forceRefreshUsers = new Set() // user_id dont le token doit être rafraîchi de force (après invalidation)
let   timers       = []          // intervals actifs — purgés à chaque (re)connexion
let   restarting   = false       // empêche les reconnexions concurrentes

async function loadSymbols(ctid) {
  const res = await connection.sendCommand('ProtoOASymbolsListReq', {
    ctidTraderAccountId: ctid, includeArchivedSymbols: false,
  })
  for (const s of res.symbol || []) {
    symbolNames.set(`${ctid}:${s.symbolId}`, s.symbolName)
  }
}

async function resolveAndAuth(row) {
  const res = await connection.sendCommand('ProtoOAGetAccountListByAccessTokenReq', {
    accessToken: row.access_token,
  })

  for (const acc of res.ctidTraderAccount || []) {
    if (CTRADER_ENV === 'live'  && acc.isLive === false) continue
    if (CTRADER_ENV === 'demo'  && acc.isLive === true)  continue

    const ctid = Number(acc.ctidTraderAccountId)
    if (authed.has(ctid)) continue

    await connection.sendCommand('ProtoOAAccountAuthReq', {
      accessToken: row.access_token, ctidTraderAccountId: ctid,
    })
    authed.set(ctid, { userId: row.user_id, ingestKey: row.ingest_key })
    await loadSymbols(ctid)

    // Persist resolved ctid — remove placeholder NULL row after first resolution
    await supabase.from('ctrader_accounts').upsert({
      user_id:                  row.user_id,
      environment:              CTRADER_ENV,
      ctid_trader_account_id:   ctid,
      access_token:             row.access_token,
      refresh_token:            row.refresh_token ?? null,
      token_expires_at:         row.token_expires_at ?? null,
      ingest_key:               row.ingest_key,
    }, { onConflict: 'user_id,ctid_trader_account_id' })

    console.log(`[ctrader] compte ${ctid} (user ${row.user_id.slice(0, 8)}) authentifié`)
  }

  // Clean up placeholder NULL-ctid row created by callback
  await supabase.from('ctrader_accounts')
    .delete()
    .eq('user_id', row.user_id)
    .is('ctid_trader_account_id', null)
}

// Échange le refresh_token contre un nouvel access_token et le persiste.
// Renvoie les nouveaux champs token, ou null en cas d'échec.
async function refreshToken(row) {
  if (!row.refresh_token) return null

  const url = new URL('https://openapi.ctrader.com/apps/token')
  url.searchParams.set('grant_type',    'refresh_token')
  url.searchParams.set('refresh_token', row.refresh_token)
  url.searchParams.set('client_id',     CTRADER_CLIENT_ID)
  url.searchParams.set('client_secret', CTRADER_CLIENT_SECRET)

  const res = await fetch(url.toString(), { method: 'POST' })
  if (!res.ok) {
    console.error('[ctrader] refresh token échec', res.status, await res.text())
    return null
  }

  const json = await res.json()
  const { accessToken, refreshToken, expiresIn } = json
  if (!accessToken) {
    console.error('[ctrader] refresh token : pas d\'accessToken', json)
    return null
  }

  const tokenExpiresAt = new Date(Date.now() + (expiresIn ?? 3600) * 1000).toISOString()
  // Persiste sur toutes les lignes du user (placeholder + comptes résolus partagent le token)
  await supabase.from('ctrader_accounts')
    .update({
      access_token:     accessToken,
      refresh_token:    refreshToken ?? row.refresh_token,
      token_expires_at: tokenExpiresAt,
    })
    .eq('user_id', row.user_id)
    .eq('environment', CTRADER_ENV)

  console.log(`[ctrader] token rafraîchi (user ${row.user_id.slice(0, 8)}, expire ${tokenExpiresAt})`)
  return { access_token: accessToken, refresh_token: refreshToken ?? row.refresh_token, token_expires_at: tokenExpiresAt }
}

// Renvoie row avec un token frais si l'expiration est proche ou si le refresh est forcé.
async function ensureFreshToken(row, force) {
  const expiresAt  = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0
  const nearExpiry = expiresAt > 0 && expiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MS
  if (!force && !nearExpiry) return row
  const refreshed = await refreshToken(row)
  return refreshed ? { ...row, ...refreshed } : row
}

async function refreshAccounts() {
  const { data, error } = await supabase
    .from('ctrader_accounts')
    .select('user_id, access_token, refresh_token, ingest_key, ctid_trader_account_id, token_expires_at')
    .eq('environment', CTRADER_ENV)
  if (error) { console.error('[supabase]', error.message); return }

  const seen = new Set()
  for (let row of data || []) {
    if (seen.has(row.access_token)) continue
    seen.add(row.access_token)

    // Rafraîchit le token si proche de l'expiration ou invalidé par le serveur
    const force = forceRefreshUsers.has(row.user_id)
    row = await ensureFreshToken(row, force)
    forceRefreshUsers.delete(row.user_id)
    seen.add(row.access_token)   // marque aussi le nouveau token comme vu

    try { await resolveAndAuth(row) } catch (e) { console.error('[auth]', e?.message) }
  }
}

async function handleExecution(event) {
  const ctid = Number(event.ctidTraderAccountId)
  const ctx  = authed.get(ctid)
  if (!ctx) return

  const deal = event.deal
  if (!deal) return

  // Opening/increasing deal — memorise entry timestamp for later
  if (!deal.closePositionDetail) {
    if (deal.positionId) {
      openPositions.set(Number(deal.positionId), {
        entry_time: deal.executionTimestamp
          ? new Date(Number(deal.executionTimestamp)).toISOString()
          : new Date().toISOString(),
      })
    }
    return
  }

  // Closing deal — build the closed-trade payload
  const cpd       = deal.closePositionDetail
  const symbol    = symbolNames.get(`${ctid}:${deal.symbolId}`) || String(deal.symbolId)
  // SELL closes a long, BUY closes a short
  const direction = deal.tradeSide === 'SELL' ? 'long' : 'short'
  // grossProfit + swap + commission are in cents (moneyDigits=2) → divide by 100
  const pnl       = ((+cpd.grossProfit || 0) + (+cpd.swap || 0) + (+cpd.commission || 0)) / 100
  // volume is in lots×100 in cTrader protobuf (1 standard lot = 100)
  const size      = (+deal.volume || 0) / 100

  const exit_time = deal.executionTimestamp
    ? new Date(Number(deal.executionTimestamp)).toISOString()
    : new Date().toISOString()
  const op          = openPositions.get(Number(deal.positionId))
  const entry_time  = op?.entry_time || exit_time
  openPositions.delete(Number(deal.positionId))

  const payload = {
    symbol,
    direction,
    size,
    entry_price:  +cpd.entryPrice    || null,
    exit_price:   +deal.executionPrice || null,
    entry_time,
    exit_time,
    pnl,
  }

  try {
    const r = await fetch(CALDRA_INGEST_URL, {
      method:  'POST',
      headers: { 'content-type': 'application/json', 'x-caldra-key': ctx.ingestKey },
      body:    JSON.stringify(payload),
    })
    if (!r.ok) {
      console.error('[ingest] échec', r.status, await r.text())
    } else {
      console.log(`[ingest] ${symbol} ${direction} pnl=${pnl.toFixed(2)}`)
    }
  } catch (e) {
    console.error('[ingest] erreur réseau', e?.message)
  }
}

// La lib n'expose AUCUN événement de déconnexion (socket onClose vide) et ses
// commandes n'ont pas de timeout : une connexion morte « hang » sans rien signaler.
// withTimeout permet de détecter ces blocages.
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout`)), ms)),
  ])
}

function clearTimers() {
  for (const t of timers) clearInterval(t)
  timers = []
}

function scheduleRestart(reason) {
  if (restarting) return
  restarting = true
  console.warn(`[ctrader] reconnexion dans 5s (${reason})`)
  clearTimers()
  try { connection?.close() } catch {}
  setTimeout(() => { restarting = false; start() }, 5_000)
}

async function start() {
  clearTimers()
  authed.clear()
  symbolNames.clear()

  connection = new CTraderConnection({ host: HOST, port: PORT })

  connection.on('ProtoOAExecutionEvent', (e) =>
    handleExecution(e).catch(console.error)
  )
  connection.on('ProtoOAAccountsTokenInvalidatedEvent', (e) => {
    const ctids = (e?.ctidTraderAccountIds || []).map(Number)
    console.warn('[ctrader] token invalidé', ctids)
    // Marque les users concernés pour refresh forcé + dé-authentifie pour forcer la ré-auth
    for (const ctid of ctids) {
      const ctx = authed.get(ctid)
      if (ctx) forceRefreshUsers.add(ctx.userId)
      authed.delete(ctid)
    }
    refreshAccounts().catch((err) => console.error('[refresh]', err?.message))
  })

  try {
    await withTimeout(connection.open(), 15_000, 'open')
    console.log(`[ctrader] connecté ${HOST}:${PORT}`)

    // Heartbeat pour maintenir la connexion ouverte côté serveur
    timers.push(setInterval(() => {
      try { connection.sendHeartbeat() } catch (e) { scheduleRestart('heartbeat: ' + e?.message) }
    }, HEARTBEAT_MS))

    await withTimeout(connection.sendCommand('ProtoOAApplicationAuthReq', {
      clientId: CTRADER_CLIENT_ID, clientSecret: CTRADER_CLIENT_SECRET,
    }), 15_000, 'app auth')
    console.log('[ctrader] application authentifiée')

    await refreshAccounts()
    // Capte les nouveaux utilisateurs OAuth sans redémarrer le worker
    timers.push(setInterval(refreshAccounts, 30_000))

    // Watchdog : ProtoOAVersionReq doit répondre. Sinon la connexion est morte → reconnexion.
    timers.push(setInterval(async () => {
      try {
        await withTimeout(connection.sendCommand('ProtoOAVersionReq', {}), 10_000, 'ping')
      } catch (e) {
        scheduleRestart('watchdog: ' + (e?.message || 'ping échoué'))
      }
    }, 30_000))
  } catch (e) {
    scheduleRestart('démarrage: ' + (e?.message || e))
  }
}

start().catch((e) => scheduleRestart('fatal: ' + (e?.message || e)))
