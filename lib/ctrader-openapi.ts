// cTrader Open API — TCP+TLS sur openapi.ctrader.com:5035
// Protocole : 4 bytes big-endian length + ProtoMessage (protobuf)

import * as tls from 'tls'

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
  const b: number[] = []
  let v = n
  while (v > 127n) { b.push(Number((v & 0x7fn) | 0x80n)); v >>= 7n }
  b.push(Number(v))
  return Buffer.from(b)
}

const zigzagEnc = (n: bigint) => n >= 0n ? n * 2n : n * -2n - 1n

const fVarint = (f: number, v: bigint) =>
  Buffer.concat([writeVarint(BigInt(f << 3)), writeVarint(v)])

const fSint64 = (f: number, v: number) => fVarint(f, zigzagEnc(BigInt(v)))
const fInt64  = (f: number, v: number) => fVarint(f, BigInt(v))

function fStr(f: number, s: string) {
  const b = Buffer.from(s, 'utf8')
  return Buffer.concat([writeVarint(BigInt((f << 3) | 2)), writeVarint(BigInt(b.length)), b])
}

function fBytes(f: number, b: Buffer) {
  return Buffer.concat([writeVarint(BigInt((f << 3) | 2)), writeVarint(BigInt(b.length)), b])
}

function frame(payloadType: number, payload: Buffer): Buffer {
  const msg = Buffer.concat([fVarint(1, BigInt(payloadType)), fBytes(2, payload)])
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(msg.length, 0)
  return Buffer.concat([len, msg])
}

// ── Protobuf decoder ──────────────────────────────────────────────────────────

type PbVal = bigint | number | Buffer

function readVarint(buf: Buffer, pos: number): [bigint, number] {
  let r = 0n, shift = 0n
  while (pos < buf.length) {
    const b = buf[pos++]
    r |= BigInt(b & 0x7f) << shift; shift += 7n
    if ((b & 0x80) === 0) break
  }
  return [r, pos]
}

const zigzagDec = (n: bigint) => (n >> 1n) ^ -(n & 1n)

function decode(buf: Buffer): Map<number, PbVal[]> {
  const m = new Map<number, PbVal[]>()
  let pos = 0
  while (pos < buf.length) {
    let tag: bigint; [tag, pos] = readVarint(buf, pos)
    const fn = Number(tag >> 3n), wt = Number(tag & 7n)
    let v: PbVal
    if      (wt === 0) { let u: bigint; [u, pos] = readVarint(buf, pos); v = u }
    else if (wt === 1) { v = buf.readDoubleLE(pos); pos += 8 }
    else if (wt === 2) { let l: bigint; [l, pos] = readVarint(buf, pos); v = buf.slice(pos, pos + Number(l)); pos += Number(l) }
    else if (wt === 5) { v = buf.readFloatLE(pos); pos += 4 }
    else break
    const arr = m.get(fn) ?? []; arr.push(v); m.set(fn, arr)
  }
  return m
}

function str(m: Map<number, PbVal[]>, f: number) {
  const v = m.get(f)?.[0]; return Buffer.isBuffer(v) ? v.toString('utf8') : ''
}

// ── Deals & symbols parsing ───────────────────────────────────────────────────

interface SymbolMap { [id: string]: string }

function parseSymbols(payload: Buffer): SymbolMap {
  const map: SymbolMap = {}
  for (const item of (decode(payload).get(2) ?? [])) {
    if (!Buffer.isBuffer(item)) continue
    const sf = decode(item)
    const id   = String(sf.get(1)?.[0] ?? '')
    const name = str(sf, 2)
    if (id && name) map[id] = name
  }
  return map
}

export interface OpenAPIDeal {
  dealId:      string
  symbol:      string
  direction:   'long' | 'short'
  volume:      number
  entryPrice:  number
  grossProfit: number
  entryTime:   string
  exitTime:    string
}

function parseDeal(buf: Buffer): OpenAPIDeal | null {
  const f = decode(buf)
  if (Number(f.get(5)?.[0] ?? 0n) !== DEAL_STATUS_FILLED) return null

  const dealId      = String(f.get(1)?.[0] ?? 0n)
  const entryPrice  = f.get(6)?.[0] as number ?? 0
  const grossProfit = Number(zigzagDec(f.get(10)?.[0] as bigint ?? 0n))
  const exitTs      = Number(zigzagDec(f.get(8)?.[0] as bigint ?? 0n))
  const entryTs     = Number(zigzagDec(f.get(9)?.[0] as bigint ?? 0n))

  const tdBuf = f.get(4)?.[0] as Buffer | undefined
  if (!tdBuf) return null
  const td      = decode(tdBuf)
  const symId   = String(td.get(1)?.[0] ?? '0')
  const volume  = Number(td.get(2)?.[0] ?? 0n)
  const side    = Number(td.get(3)?.[0] ?? 1n)

  return {
    dealId,
    symbol:      symId,
    direction:   side === 1 ? 'long' : 'short',
    volume,
    entryPrice,
    grossProfit,
    entryTime:   new Date(entryTs || exitTs).toISOString(),
    exitTime:    new Date(exitTs  || entryTs).toISOString(),
  }
}

// ── TCP+TLS client ────────────────────────────────────────────────────────────

export async function fetchDealsOpenAPI(opts: {
  ctidTraderAccountId: number
  accessToken:         string
  fromMs:              number
  toMs:                number
  isLive?:             boolean
  timeoutMs?:          number
}): Promise<OpenAPIDeal[]> {
  const { ctidTraderAccountId, accessToken, fromMs, toMs, isLive = true, timeoutMs = 20000 } = opts
  const port = isLive ? 5035 : 5036

  return new Promise((resolve, reject) => {
    const socket  = tls.connect({ host: 'openapi.ctrader.com', port })
    let partial   = Buffer.alloc(0)
    let step      = 'app_auth'
    let symbols: SymbolMap = {}
    let settled   = false

    function done(result: OpenAPIDeal[] | Error) {
      if (settled) return; settled = true
      clearTimeout(timer)
      try { socket.destroy() } catch {}
      result instanceof Error ? reject(result) : resolve(result)
    }

    const timer = setTimeout(() => done(new Error('cTrader Open API timeout')), timeoutMs)

    socket.on('error', done)
    socket.on('close', () => { if (!settled) done(new Error('cTrader connection closed unexpectedly')) })

    function send(payloadType: number, payload: Buffer) {
      socket.write(frame(payloadType, payload))
    }

    socket.on('secureConnect', () => {
      send(PT.APP_AUTH_REQ, Buffer.concat([
        fStr(1, process.env.CTRADER_CLIENT_ID!),
        fStr(2, process.env.CTRADER_CLIENT_SECRET!),
      ]))
    })

    socket.on('data', (chunk: Buffer) => {
      partial = Buffer.concat([partial, chunk])

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
          return done(new Error(`cTrader error: ${str(ef, 2)} — ${str(ef, 3)}`))
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
          const deals: OpenAPIDeal[] = []
          for (const item of (decode(payload).get(2) ?? [])) {
            if (!Buffer.isBuffer(item)) continue
            const d = parseDeal(item)
            if (!d) continue
            d.symbol = symbols[d.symbol] ?? d.symbol
            deals.push(d)
          }
          done(deals)
        }
      }
    })
  })
}
