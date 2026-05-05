// cTrader Open API — WebSocket + protobuf (short-lived connection, no extra deps)
// Protocol: wss://openapi.ctrader.com/ — 4-byte length prefix + ProtoMessage

import WebSocket from 'ws'

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

const DEAL_STATUS_FILLED = 2

// ── Protobuf encoder ──────────────────────────────────────────────────────────

function writeVarint(n: bigint): Buffer {
  const bytes: number[] = []
  let v = n
  while (v > 127n) { bytes.push(Number((v & 0x7fn) | 0x80n)); v >>= 7n }
  bytes.push(Number(v))
  return Buffer.from(bytes)
}

const zigzagEnc = (n: bigint) => n >= 0n ? n * 2n : n * -2n - 1n

function fVarint(field: number, v: bigint) {
  return Buffer.concat([writeVarint(BigInt(field << 3)), writeVarint(v)])
}
function fSint64(field: number, v: number) {
  return fVarint(field, zigzagEnc(BigInt(v)))
}
function fInt64(field: number, v: number) {
  return fVarint(field, BigInt(v))
}
function fStr(field: number, s: string) {
  const b = Buffer.from(s, 'utf8')
  return Buffer.concat([writeVarint(BigInt((field << 3) | 2)), writeVarint(BigInt(b.length)), b])
}
function fBytes(field: number, b: Buffer) {
  return Buffer.concat([writeVarint(BigInt((field << 3) | 2)), writeVarint(BigInt(b.length)), b])
}

function frame(payloadType: number, payload: Buffer): Buffer {
  const msg = Buffer.concat([fVarint(1, BigInt(payloadType)), fBytes(2, payload)])
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(msg.length, 0)
  return Buffer.concat([len, msg])
}

// ── Protobuf decoder ──────────────────────────────────────────────────────────

type PbValue = bigint | number | Buffer

function readVarint(buf: Buffer, pos: number): [bigint, number] {
  let r = 0n, shift = 0n
  while (pos < buf.length) {
    const b = buf[pos++]
    r |= BigInt(b & 0x7f) << shift
    shift += 7n
    if ((b & 0x80) === 0) break
  }
  return [r, pos]
}

const zigzagDec = (n: bigint) => (n >> 1n) ^ -(n & 1n)

function decode(buf: Buffer): Map<number, PbValue[]> {
  const m = new Map<number, PbValue[]>()
  let pos = 0
  while (pos < buf.length) {
    let tag: bigint; [tag, pos] = readVarint(buf, pos)
    const fn = Number(tag >> 3n), wt = Number(tag & 7n)
    let v: PbValue
    if (wt === 0) {
      let u: bigint; [u, pos] = readVarint(buf, pos); v = u
    } else if (wt === 1) {
      v = buf.readDoubleLE(pos); pos += 8
    } else if (wt === 2) {
      let l: bigint; [l, pos] = readVarint(buf, pos)
      v = buf.slice(pos, pos + Number(l)); pos += Number(l)
    } else if (wt === 5) {
      v = buf.readFloatLE(pos); pos += 4
    } else break
    const arr = m.get(fn) ?? []; arr.push(v); m.set(fn, arr)
  }
  return m
}

function getStr(m: Map<number, PbValue[]>, field: number): string {
  const v = m.get(field)?.[0]
  return Buffer.isBuffer(v) ? v.toString('utf8') : ''
}

// ── Decoded deal ──────────────────────────────────────────────────────────────

export interface OpenAPIDeal {
  dealId:    string
  symbolId:  string
  direction: 'long' | 'short'
  volume:    number   // raw cTrader volume
  entryPrice: number
  grossProfit: number // in deposit currency × 100
  entryTime:  string
  exitTime:   string
}

function parseDeal(buf: Buffer): OpenAPIDeal | null {
  const f = decode(buf)

  const dealStatus = Number(f.get(5)?.[0] ?? 0n)
  if (dealStatus !== DEAL_STATUS_FILLED) return null

  const dealId      = String(f.get(1)?.[0] ?? 0n)
  const entryPrice  = f.get(6)?.[0] as number ?? 0
  const grossProfit = Number(zigzagDec(f.get(10)?.[0] as bigint ?? 0n))

  // executionTimestamp (field 8) and createTimestamp (field 9) are sint64
  const exitTs  = Number(zigzagDec(f.get(8)?.[0] as bigint ?? 0n))
  const entryTs = Number(zigzagDec(f.get(9)?.[0] as bigint ?? 0n))

  // tradeData (field 4) — embedded message
  const tdBuf = f.get(4)?.[0] as Buffer | undefined
  if (!tdBuf) return null
  const td       = decode(tdBuf)
  const symbolId = String(td.get(1)?.[0] ?? 0n)
  const volume   = Number(td.get(2)?.[0] ?? 0n)
  const side     = Number(td.get(3)?.[0] ?? 1n) // 1=BUY, 2=SELL

  return {
    dealId,
    symbolId,
    direction: side === 1 ? 'long' : 'short',
    volume,
    entryPrice,
    grossProfit,
    entryTime:  new Date(entryTs || exitTs).toISOString(),
    exitTime:   new Date(exitTs  || entryTs).toISOString(),
  }
}

// ── Symbol list ───────────────────────────────────────────────────────────────

interface SymbolMap { [id: string]: string }

function parseSymbols(buf: Buffer): SymbolMap {
  const map: SymbolMap = {}
  const f = decode(buf)
  for (const item of (f.get(2) ?? [])) {
    if (!Buffer.isBuffer(item)) continue
    const sf = decode(item)
    const id   = String(sf.get(1)?.[0] ?? '')
    const name = getStr(sf, 2)
    if (id && name) map[id] = name
  }
  return map
}

// ── WebSocket client ──────────────────────────────────────────────────────────

export async function fetchDealsOpenAPI(opts: {
  ctidTraderAccountId: number
  accessToken:         string
  fromMs:              number
  toMs:                number
  timeoutMs?:          number
}): Promise<OpenAPIDeal[]> {
  const { ctidTraderAccountId, accessToken, fromMs, toMs, timeoutMs = 20000 } = opts

  return new Promise((resolve, reject) => {
    const ws     = new WebSocket('wss://openapi.ctrader.com/')
    let step     = 'app_auth'
    let symbols: SymbolMap = {}
    let settled  = false
    let partial  = Buffer.alloc(0)

    function done(result: OpenAPIDeal[] | Error) {
      if (settled) return; settled = true
      clearTimeout(timer)
      try { ws.close() } catch {}
      result instanceof Error ? reject(result) : resolve(result)
    }

    const timer = setTimeout(() => done(new Error('cTrader Open API timeout')), timeoutMs)

    ws.on('error', (e) => done(e))
    ws.on('close', () => { if (!settled) done(new Error('Connection closed unexpectedly')) })

    function send(payloadType: number, payload: Buffer) {
      ws.send(frame(payloadType, payload))
    }

    ws.on('open', () => {
      send(PT.APP_AUTH_REQ, Buffer.concat([
        fStr(1, process.env.CTRADER_CLIENT_ID!),
        fStr(2, process.env.CTRADER_CLIENT_SECRET!),
      ]))
    })

    ws.on('message', (raw: Buffer) => {
      partial = Buffer.concat([partial, Buffer.isBuffer(raw) ? raw : Buffer.from(raw as unknown as ArrayBuffer)])

      while (partial.length >= 4) {
        const msgLen = partial.readUInt32BE(0)
        if (partial.length < 4 + msgLen) break

        const msgBuf = partial.slice(4, 4 + msgLen)
        partial = partial.slice(4 + msgLen)

        const outer = decode(msgBuf)
        const payloadType = Number(outer.get(1)?.[0] ?? 0n)
        const payload     = outer.get(2)?.[0] as Buffer ?? Buffer.alloc(0)

        if (payloadType === PT.ERROR_RES) {
          const ef = decode(payload)
          return done(new Error(`cTrader error: ${getStr(ef, 2)}`))
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
          step    = 'get_deals'
          send(PT.GET_DEAL_LIST_REQ, Buffer.concat([
            fSint64(1, ctidTraderAccountId),
            fInt64(2, fromMs),
            fInt64(3, toMs),
          ]))

        } else if (payloadType === PT.GET_DEAL_LIST_RES && step === 'get_deals') {
          const f    = decode(payload)
          const deals: OpenAPIDeal[] = []
          for (const item of (f.get(2) ?? [])) {
            if (!Buffer.isBuffer(item)) continue
            const d = parseDeal(item)
            if (!d) continue
            if (symbols[d.symbolId]) d.symbolId = symbols[d.symbolId]
            deals.push(d)
          }
          done(deals)
        }
      }
    })
  })
}
