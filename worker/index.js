// Caldra cTrader Worker — Railway persistent process
// Polls all active cTrader connections every 30s via TCP+TLS port 5035

'use strict'

const tls     = require('tls')
const https   = require('https')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL             = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CTRADER_CLIENT_ID        = process.env.CTRADER_CLIENT_ID
const CTRADER_CLIENT_SECRET    = process.env.CTRADER_CLIENT_SECRET
const WORKER_SECRET            = process.env.WORKER_SECRET
const CALDRA_URL               = process.env.CALDRA_URL // e.g. https://getcaldra.com

const POLL_INTERVAL_MS = 30_000
const DEAL_STATUS_FILLED = 2

const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── Protobuf helpers ──────────────────────────────────────────────────────────

function writeVarint(n) {
  const b = []
  let v = BigInt(n)
  while (v > 127n) { b.push(Number((v & 0x7fn) | 0x80n)); v >>= 7n }
  b.push(Number(v))
  return Buffer.from(b)
}

const zigzagEnc = n => { const b = BigInt(n); return b >= 0n ? b * 2n : b * -2n - 1n }
const zigzagDec = n => (n >> 1n) ^ -(n & 1n)

const fVarint = (f, v) => Buffer.concat([writeVarint(BigInt(f) << 3n), writeVarint(v)])
const fSint64 = (f, v) => fVarint(f, zigzagEnc(v))
const fInt64  = (f, v) => fVarint(f, BigInt(v))

function fStr(f, s) {
  const b = Buffer.from(s, 'utf8')
  return Buffer.concat([writeVarint((BigInt(f) << 3n) | 2n), writeVarint(BigInt(b.length)), b])
}

function fBytes(f, b) {
  return Buffer.concat([writeVarint((BigInt(f) << 3n) | 2n), writeVarint(BigInt(b.length)), b])
}

function frame(payloadType, payload) {
  const msg = Buffer.concat([fVarint(1, BigInt(payloadType)), fBytes(2, payload)])
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(msg.length, 0)
  return Buffer.concat([len, msg])
}

function readVarint(buf, pos) {
  let r = 0n, shift = 0n
  while (pos < buf.length) {
    const b = buf[pos++]
    r |= BigInt(b & 0x7f) << shift; shift += 7n
    if ((b & 0x80) === 0) break
  }
  return [r, pos]
}

function decode(buf) {
  const m = new Map()
  let pos = 0
  while (pos < buf.length) {
    let tag; [tag, pos] = readVarint(buf, pos)
    const fn = Number(tag >> 3n), wt = Number(tag & 7n)
    let v
    if      (wt === 0) { let u; [u, pos] = readVarint(buf, pos); v = u }
    else if (wt === 1) { v = buf.readDoubleLE(pos); pos += 8 }
    else if (wt === 2) { let l; [l, pos] = readVarint(buf, pos); v = buf.slice(pos, pos + Number(l)); pos += Number(l) }
    else if (wt === 5) { v = buf.readFloatLE(pos); pos += 4 }
    else break
    const arr = m.get(fn) ?? []; arr.push(v); m.set(fn, arr)
  }
  return m
}

function pbStr(m, f) {
  const v = m.get(f)?.[0]; return Buffer.isBuffer(v) ? v.toString('utf8') : ''
}

// ── Payload type codes ────────────────────────────────────────────────────────

const PT = {
  APP_AUTH_REQ:      2100,
  APP_AUTH_RES:      2101,
  ACCOUNT_AUTH_REQ:  2102,
  ACCOUNT_AUTH_RES:  2103,
  SYMBOLS_LIST_REQ:  2114,
  SYMBOLS_LIST_RES:  2115,
  GET_DEAL_LIST_REQ: 2152,
  GET_DEAL_LIST_RES: 2153,
  ERROR_RES:         2142,
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseSymbols(payload) {
  const map = {}
  for (const item of (decode(payload).get(2) ?? [])) {
    if (!Buffer.isBuffer(item)) continue
    const sf = decode(item)
    const id   = String(sf.get(1)?.[0] ?? '')
    const name = pbStr(sf, 2)
    if (id && name) map[id] = name
  }
  return map
}

function parseDeal(buf) {
  const f = decode(buf)

  const dealId = String(f.get(1)?.[0] ?? 0n)
  const status = Number(f.get(5)?.[0] ?? 0n)

  if (status !== DEAL_STATUS_FILLED) {
    console.log(`[worker] deal=${dealId} skipped — status=${status} (not FILLED)`)
    return null
  }

  // closePositionDetail (field 13) is only present on closing deals
  const cpdBuf = f.get(13)?.[0]
  if (!cpdBuf || !Buffer.isBuffer(cpdBuf)) {
    console.log(`[worker] deal=${dealId} skipped — no closePositionDetail (opening deal)`)
    return null
  }

  const cpd         = decode(cpdBuf)
  const entryPrice  = cpd.get(1)?.[0] ?? 0                          // double
  const grossProfit = Number(zigzagDec(cpd.get(2)?.[0] ?? 0n))      // sint64, ×100
  const entryTs     = Number(cpd.get(12)?.[0] ?? 0n)                // openTimestamp ms
  const exitPrice   = f.get(6)?.[0] ?? 0                            // deal execution price
  const exitTs      = Number(f.get(8)?.[0] ?? 0n)                   // executionTimestamp ms

  const tdBuf = f.get(4)?.[0]
  if (!tdBuf || !Buffer.isBuffer(tdBuf)) return null
  const td     = decode(tdBuf)
  const symId  = String(td.get(1)?.[0] ?? '0')
  const volume = Number(td.get(2)?.[0] ?? 0n)
  const side   = Number(td.get(3)?.[0] ?? 1n)

  console.log(`[worker] deal=${dealId} parsed — symbol=${symId} side=${side} vol=${volume} entry=${entryPrice} exit=${exitPrice} pnl=${grossProfit / 100}`)

  return {
    dealId,
    symbolId:  symId,
    direction: side === 1 ? 'long' : 'short',
    volume,
    entryPrice,
    exitPrice,
    grossProfit,
    entryTime: new Date(entryTs || exitTs).toISOString(),
    exitTime:  new Date(exitTs  || entryTs).toISOString(),
  }
}

// ── cTrader TCP fetch ─────────────────────────────────────────────────────────

function fetchDeals({ ctidTraderAccountId, accessToken, fromMs, toMs, timeoutMs = 25000 }) {
  return new Promise((resolve, reject) => {
    const socket  = tls.connect({ host: 'openapi.ctrader.com', port: 5035 })
    let partial   = Buffer.alloc(0)
    let step      = 'app_auth'
    let symbols   = {}
    let settled   = false

    function done(result) {
      if (settled) return; settled = true
      clearTimeout(timer)
      try { socket.destroy() } catch {}
      result instanceof Error ? reject(result) : resolve(result)
    }

    const timer = setTimeout(() => done(new Error('cTrader timeout')), timeoutMs)

    socket.on('error', err => done(new Error(`TCP ${err.code ?? 'ERR'}: ${err.message}`)))
    socket.on('close', () => { if (!settled) done(new Error('connection closed unexpectedly')) })

    const send = (pt, payload) => socket.write(frame(pt, payload))

    socket.on('secureConnect', () => {
      send(PT.APP_AUTH_REQ, Buffer.concat([
        fStr(1, CTRADER_CLIENT_ID),
        fStr(2, CTRADER_CLIENT_SECRET),
      ]))
    })

    socket.on('data', chunk => {
      partial = Buffer.concat([partial, chunk])
      while (partial.length >= 4) {
        const msgLen = partial.readUInt32BE(0)
        if (partial.length < 4 + msgLen) break
        const msgBuf = partial.slice(4, 4 + msgLen)
        partial = partial.slice(4 + msgLen)

        const outer      = decode(msgBuf)
        const payloadType = Number(outer.get(1)?.[0] ?? 0n)
        const payload     = outer.get(2)?.[0] ?? Buffer.alloc(0)

        if (payloadType === PT.ERROR_RES) {
          const ef = decode(payload)
          return done(new Error(`cTrader error: ${pbStr(ef, 2)} — ${pbStr(ef, 3)}`))
        }

        if (payloadType === PT.APP_AUTH_RES && step === 'app_auth') {
          step = 'account_auth'
          send(PT.ACCOUNT_AUTH_REQ, Buffer.concat([
            fSint64(1, ctidTraderAccountId),
            fStr(2, accessToken),
          ]))

        } else if (payloadType === PT.ACCOUNT_AUTH_RES && step === 'account_auth') {
          step = 'symbols'
          send(PT.SYMBOLS_LIST_REQ, fSint64(1, ctidTraderAccountId))

        } else if (payloadType === PT.SYMBOLS_LIST_RES && step === 'symbols') {
          symbols = parseSymbols(payload)
          step = 'get_deals'
          send(PT.GET_DEAL_LIST_REQ, Buffer.concat([
            fSint64(1, ctidTraderAccountId),
            fInt64(2, fromMs),
            fInt64(3, toMs),
          ]))

        } else if (payloadType === PT.GET_DEAL_LIST_RES && step === 'get_deals') {
          const rawItems = (decode(payload).get(2) ?? []).filter(Buffer.isBuffer)
          console.log(`[worker] GET_DEAL_LIST_RES — ${rawItems.length} raw deals received`)
          const deals = []
          for (const item of rawItems) {
            const d = parseDeal(item)
            if (!d) continue
            d.symbol = symbols[d.symbolId] ?? d.symbolId
            deals.push(d)
          }
          done(deals)
        }
      }
    })
  })
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const data   = JSON.stringify(body)
    const req = https.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
    }, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => { try { resolve(JSON.parse(raw)) } catch { resolve(raw) } })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// ── Per-connection poll ───────────────────────────────────────────────────────

async function pollConnection(conn) {
  const { user_id, account_id, access_token, account_name } = conn
  const fromMs = Date.now() - 24 * 60 * 60 * 1000
  const toMs   = Date.now()

  let deals
  try {
    deals = await fetchDeals({
      ctidTraderAccountId: Number(account_id),
      accessToken: access_token,
      fromMs,
      toMs,
    })
  } catch (err) {
    console.error(`[worker] fetchDeals failed user=${user_id} account=${account_id}:`, err.message)
    return
  }

  console.log(`[worker] user=${user_id} account=${account_name ?? account_id} — ${deals.length} deals fetched`)

  let inserted = 0
  for (const deal of deals) {
    const { data: existing } = await service
      .from('trades').select('id')
      .eq('user_id', user_id)
      .eq('ctrader_deal_id', deal.dealId)
      .maybeSingle()

    if (existing) continue

    const payload = {
      user_id,
      symbol:          deal.symbol,
      direction:       deal.direction,
      size:            deal.volume / 100,
      entry_price:     deal.entryPrice,
      exit_price:      deal.exitPrice,
      entry_time:      deal.entryTime,
      exit_time:       deal.exitTime,
      pnl:             deal.grossProfit / 100,
      ctrader_deal_id: deal.dealId,
    }

    const { data: trade, error: insertErr } = await service
      .from('trades').insert(payload).select().single()

    if (insertErr) {
      console.error(`[worker] Insert failed deal=${deal.dealId}:`, insertErr.message)
      continue
    }

    // Trigger behavioral analysis on Vercel
    try {
      await post(`${CALDRA_URL}/api/worker/analyze`, trade, { 'x-worker-secret': WORKER_SECRET })
    } catch (err) {
      console.error(`[worker] analyze failed deal=${deal.dealId}:`, err.message)
    }

    console.log(`[worker] deal=${deal.dealId} inserted — symbol=${deal.symbol} pnl=${payload.pnl}`)
    inserted++
  }

  await service.from('ctrader_connections')
    .update({ last_polled_at: new Date().toISOString() })
    .eq('user_id', user_id)

  return inserted
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function run() {
  console.log('[worker] polling cycle start')

  const { data: connections, error } = await service
    .from('ctrader_connections')
    .select('*')
    .eq('is_active', true)

  if (error) { console.error('[worker] Supabase error:', error.message); return }
  if (!connections?.length) { console.log('[worker] no active connections'); return }

  await Promise.allSettled(connections.map(pollConnection))
  console.log('[worker] polling cycle done')
}

// Validate required env vars
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CTRADER_CLIENT_ID', 'CTRADER_CLIENT_SECRET', 'WORKER_SECRET', 'CALDRA_URL']
for (const v of required) {
  if (!process.env[v]) { console.error(`[worker] Missing env var: ${v}`); process.exit(1) }
}

console.log('[worker] Caldra cTrader worker started')
run()
setInterval(run, POLL_INTERVAL_MS)
