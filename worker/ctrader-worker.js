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
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  CALDRA_INGEST_URL     = 'https://getcaldra.com/api/ingest',
} = process.env

// Un SEUL worker gère les deux environnements dans le même processus.
// C'est volontaire : un seul jeton OAuth couvre démo + live, et le rafraîchir
// depuis deux processus concurrents fait que cTrader détecte la réutilisation
// du refresh_token (rotation OAuth) et révoque toute l'autorisation.
// CTRADER_ENV peut restreindre à un seul env si besoin (ex. 'demo' ou 'live'),
// sinon les deux sont lancés.
const HOSTS = { demo: 'demo.ctraderapi.com', live: 'live.ctraderapi.com' }
const PORT  = 5035
const ENVS  = (process.env.CTRADER_ENV && HOSTS[process.env.CTRADER_ENV])
  ? [process.env.CTRADER_ENV]
  : ['demo', 'live']

const HEARTBEAT_MS = 10_000
const TOKEN_REFRESH_BUFFER_MS = 10 * 60_000   // rafraîchit le token 10 min avant expiration

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const forceRefreshUsers = new Set() // user_id dont le token doit être rafraîchi de force (après invalidation)
let   noAccountsLogged   = false     // ne logger "aucune ligne" qu'une fois

// État par environnement — une connexion CTraderConnection isolée chacune.
function makeEnvState(env) {
  return {
    env,
    host:           HOSTS[env],
    conn:           null,
    appAuthed:      false,
    authed:         new Map(),  // ctid -> { userId, ingestKey }
    symbolNames:    new Map(),  // `${ctid}:${symbolId}` -> 'EURUSD'
    openPositions:  new Map(),  // positionId -> { entry_time }
    loggedAccounts: new Set(),  // ctid déjà logués — évite la répétition toutes les 30s
    timers:         [],
    restarting:     false,
  }
}

const envStates = ENVS.map(makeEnvState)
const envByName = Object.fromEntries(envStates.map(s => [s.env, s]))

async function loadSymbols(state, ctid) {
  const res = await state.conn.sendCommand('ProtoOASymbolsListReq', {
    ctidTraderAccountId: ctid, includeArchivedSymbols: false,
  })
  for (const s of res.symbol || []) {
    state.symbolNames.set(`${ctid}:${s.symbolId}`, s.symbolName)
  }
}

// Une connexion app-authed quelconque suffit pour lister les comptes du token.
function listerConn() {
  return envStates.find(s => s.appAuthed)?.conn || null
}

async function resolveAndAuth(row) {
  const lister = listerConn()
  if (!lister) return   // aucune connexion prête à ce tick

  const res = await lister.sendCommand('ProtoOAGetAccountListByAccessTokenReq', {
    accessToken: row.access_token,
  })
  const accounts = res.ctidTraderAccount || []

  let resolvedAny = false
  for (const acc of accounts) {
    const ctid = Number(acc.ctidTraderAccountId)
    const env  = acc.isLive ? 'live' : 'demo'
    const state = envByName[env]

    // Cet environnement n'est pas géré par ce worker (CTRADER_ENV restreint) → ignoré.
    if (!state) {
      if (!_loggedSkip.has(ctid)) {
        console.log(`[ctrader] compte ${ctid} ignoré (compte ${env}, non géré par ce worker)`)
        _loggedSkip.add(ctid)
      }
      continue
    }
    // La connexion de cet env n'est pas encore prête → on réessaiera au prochain tick.
    if (!state.appAuthed) continue

    // Déjà authentifié sur la socket : pas besoin de ré-auth, mais on RAFRAÎCHIT le
    // contexte. Une déconnexion/reconnexion OAuth régénère l'ingest_key — sans ça, le
    // worker garderait l'ancienne clé (supprimée au /disconnect) → /api/ingest 401.
    if (state.authed.has(ctid)) {
      state.authed.set(ctid, { userId: row.user_id, ingestKey: row.ingest_key })
      resolvedAny = true
      continue
    }

    try {
      await withTimeout(state.conn.sendCommand('ProtoOAAccountAuthReq', {
        accessToken: row.access_token, ctidTraderAccountId: ctid,
      }), 10_000, `${env} account auth`)
    } catch (e) {
      // Reconnexion sans redémarrage worker : le compte est encore loggué sur la
      // socket → ALREADY_LOGGED_IN n'est pas une erreur, on enregistre quand même.
      const msg = `${e?.message || ''} ${JSON.stringify(e)}`
      if (!/ALREADY_LOGGED_IN/i.test(msg)) {
        console.error(`[ctrader:${env}] échec ProtoOAAccountAuthReq compte ${ctid}:`, JSON.stringify(e))
        continue
      }
      console.log(`[ctrader:${env}] compte ${ctid} déjà loggué — contexte rafraîchi`)
    }
    state.authed.set(ctid, { userId: row.user_id, ingestKey: row.ingest_key })
    await loadSymbols(state, ctid)

    // Persiste le ctid résolu AVEC son vrai environnement (le callback écrit un
    // placeholder 'live' par défaut — on le corrige ici selon isLive).
    await supabase.from('ctrader_accounts').upsert({
      user_id:                  row.user_id,
      environment:              env,
      ctid_trader_account_id:   ctid,
      access_token:             row.access_token,
      refresh_token:            row.refresh_token ?? null,
      token_expires_at:         row.token_expires_at ?? null,
      ingest_key:               row.ingest_key,
    }, { onConflict: 'user_id,ctid_trader_account_id' })

    resolvedAny = true
    state.loggedAccounts.add(ctid)
    console.log(`[ctrader:${env}] compte ${ctid} (user ${row.user_id.slice(0, 8)}) authentifié`)
  }

  // Supprime la ligne placeholder (ctid null) du callback une fois au moins un
  // compte résolu — un seul worker, donc plus de race entre environnements.
  if (resolvedAny) {
    await supabase.from('ctrader_accounts')
      .delete()
      .eq('user_id', row.user_id)
      .is('ctid_trader_account_id', null)
  }
}
const _loggedSkip = new Set()

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
  // Persiste sur toutes les lignes du user (un seul token OAuth couvre démo + live)
  await supabase.from('ctrader_accounts')
    .update({
      access_token:     accessToken,
      refresh_token:    refreshToken ?? row.refresh_token,
      token_expires_at: tokenExpiresAt,
    })
    .eq('user_id', row.user_id)

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

// Boucle CENTRALE unique : lit les tokens, les rafraîchit une seule fois, puis
// route chaque compte vers la connexion du bon environnement. Une seule boucle
// dans tout le processus → aucune rotation de refresh_token concurrente.
async function refreshAccounts() {
  const { data, error } = await supabase
    .from('ctrader_accounts')
    .select('user_id, access_token, refresh_token, ingest_key, ctid_trader_account_id, token_expires_at')
  if (error) { console.error('[supabase]', error.message); return }

  // Réconciliation : tout compte gardé en mémoire dont la clé d'ingestion n'existe
  // plus en base a été déconnecté (le /disconnect supprime la ligne + la clé).
  // On l'oublie → handleExecution l'ignore aussitôt → l'ingestion s'arrête net.
  const validKeys = new Set((data || []).map(r => r.ingest_key))
  for (const state of envStates) {
    for (const ctid of [...state.authed.keys()]) {
      if (!validKeys.has(state.authed.get(ctid).ingestKey)) {
        state.authed.delete(ctid)
        state.loggedAccounts.delete(ctid)
        _loggedSkip.delete(ctid)
        console.log(`[ctrader:${state.env}] compte ${ctid} oublié (déconnecté)`)
      }
    }
  }

  if ((data || []).length === 0) {
    if (!noAccountsLogged) { console.log('[ctrader] aucune ligne ctrader_accounts en base — en attente de connexion OAuth'); noAccountsLogged = true }
    return
  }
  noAccountsLogged = false

  const seen = new Set()
  for (let row of data || []) {
    if (seen.has(row.access_token)) continue
    seen.add(row.access_token)

    // Rafraîchit le token si proche de l'expiration ou invalidé par le serveur
    const force = forceRefreshUsers.has(row.user_id)
    row = await ensureFreshToken(row, force)
    forceRefreshUsers.delete(row.user_id)
    seen.add(row.access_token)   // marque aussi le nouveau token comme vu

    try { await resolveAndAuth(row) } catch (e) { console.error('[auth]', e?.message || JSON.stringify(e)) }
  }
}

async function handleExecution(state, event) {
  const ctid = Number(event.ctidTraderAccountId)
  const ctx  = state.authed.get(ctid)
  if (!ctx) return

  const deal = event.deal
  if (!deal) return

  // Opening/increasing deal — memorise entry timestamp + stop-loss for later
  if (!deal.closePositionDetail) {
    if (deal.positionId) {
      state.openPositions.set(Number(deal.positionId), {
        entry_time: deal.executionTimestamp
          ? new Date(Number(deal.executionTimestamp)).toISOString()
          : new Date().toISOString(),
        // Le stop-loss vit sur la position (prix). Présent si attaché à l'ordre.
        stop_loss: event.position?.stopLoss != null ? Number(event.position.stopLoss) : null,
      })
    }
    return
  }

  // Closing deal — build the closed-trade payload
  const cpd       = deal.closePositionDetail
  const symbol    = state.symbolNames.get(`${ctid}:${deal.symbolId}`) || String(deal.symbolId)
  // SELL closes a long, BUY closes a short
  const direction = deal.tradeSide === 'SELL' ? 'long' : 'short'
  // grossProfit + swap + commission are in cents (moneyDigits=2) → divide by 100
  const pnl       = ((+cpd.grossProfit || 0) + (+cpd.swap || 0) + (+cpd.commission || 0)) / 100
  // volume is in lots×100 in cTrader protobuf (1 standard lot = 100)
  const size      = (+deal.volume || 0) / 100

  const exit_time = deal.executionTimestamp
    ? new Date(Number(deal.executionTimestamp)).toISOString()
    : new Date().toISOString()
  const op          = state.openPositions.get(Number(deal.positionId))
  const entry_time  = op?.entry_time || exit_time
  // Stop-loss capturé à l'ouverture ; sinon, dernier connu sur la position au close.
  const stop_loss   = op?.stop_loss ?? (event.position?.stopLoss != null ? Number(event.position.stopLoss) : null)
  state.openPositions.delete(Number(deal.positionId))

  const payload = {
    symbol,
    direction,
    size,
    entry_price:  +cpd.entryPrice    || null,
    exit_price:   +deal.executionPrice || null,
    entry_time,
    exit_time,
    pnl,
    stop_loss,
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
      console.log(`[ingest:${state.env}] ${symbol} ${direction} pnl=${pnl.toFixed(2)}`)
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

function clearTimers(state) {
  for (const t of state.timers) clearInterval(t)
  state.timers = []
}

// Redémarre UNIQUEMENT la connexion de cet environnement — l'autre reste vivante.
function restartEnv(state, reason) {
  if (state.restarting) return
  state.restarting = true
  console.warn(`[ctrader:${state.env}] reconnexion dans 5s (${reason})`)
  clearTimers(state)
  state.appAuthed = false
  try { state.conn?.close() } catch {}
  setTimeout(() => { state.restarting = false; startEnv(state) }, 5_000)
}

async function startEnv(state) {
  clearTimers(state)
  state.appAuthed = false
  state.authed.clear()
  state.symbolNames.clear()
  state.loggedAccounts.clear()

  state.conn = new CTraderConnection({ host: state.host, port: PORT })

  state.conn.on('ProtoOAExecutionEvent', (e) =>
    handleExecution(state, e).catch(console.error)
  )
  state.conn.on('ProtoOAAccountsTokenInvalidatedEvent', (e) => {
    const ctids = (e?.ctidTraderAccountIds || []).map(Number)
    console.warn(`[ctrader:${state.env}] token invalidé`, ctids)
    for (const ctid of ctids) {
      const ctx = state.authed.get(ctid)
      if (ctx) forceRefreshUsers.add(ctx.userId)
      state.authed.delete(ctid)
    }
    refreshAccounts().catch((err) => console.error('[refresh]', err?.message))
  })

  try {
    await withTimeout(state.conn.open(), 15_000, `${state.env} open`)
    console.log(`[ctrader:${state.env}] connecté ${state.host}:${PORT}`)

    // Heartbeat pour maintenir la connexion ouverte côté serveur
    state.timers.push(setInterval(() => {
      try { state.conn.sendHeartbeat() } catch (e) { restartEnv(state, 'heartbeat: ' + e?.message) }
    }, HEARTBEAT_MS))

    await withTimeout(state.conn.sendCommand('ProtoOAApplicationAuthReq', {
      clientId: CTRADER_CLIENT_ID, clientSecret: CTRADER_CLIENT_SECRET,
    }), 15_000, `${state.env} app auth`)
    state.appAuthed = true
    console.log(`[ctrader:${state.env}] application authentifiée`)

    // Watchdog : ProtoOAVersionReq doit répondre. Sinon la connexion est morte → reconnexion.
    state.timers.push(setInterval(async () => {
      try {
        await withTimeout(state.conn.sendCommand('ProtoOAVersionReq', {}), 10_000, 'ping')
      } catch (e) {
        restartEnv(state, 'watchdog: ' + (e?.message || 'ping échoué'))
      }
    }, 30_000))
  } catch (e) {
    restartEnv(state, 'démarrage: ' + (e?.message || e))
  }
}

let refreshLoopTimer = null

async function main() {
  // Ouvre toutes les connexions d'environnement en parallèle.
  await Promise.all(envStates.map(startEnv))

  // Boucle de rafraîchissement/résolution CENTRALE et unique.
  await refreshAccounts()
  refreshLoopTimer = setInterval(() => {
    refreshAccounts().catch((err) => console.error('[refresh]', err?.message))
  }, 30_000)
}

main().catch((e) => {
  console.error('[ctrader] fatal', e?.message || e)
  // Redémarre tout après 5s en cas d'échec global du démarrage.
  setTimeout(() => { if (refreshLoopTimer) clearInterval(refreshLoopTimer); main().catch(console.error) }, 5_000)
})
