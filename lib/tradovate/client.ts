/**
 * TradovateClient — WebSocket client pour Tradovate
 *
 * Protocole : SockJS sur wss://demo.tradovateapi.com/v1/websocket
 * Surveille les positions fermées en temps réel et les envoie à /api/ingest.
 *
 * NOTE ARCHITECTURE : Ce client utilise un singleton module-level pour persister
 * les connexions entre requêtes HTTP. Fonctionne en développement et en
 * environnement single-instance (VPS, Docker). Sur Vercel (serverless), chaque
 * cold start perd les connexions — privilégier une instance dédiée dans ce cas.
 */

import WebSocket from 'ws'

// ── Endpoints ──────────────────────────────────────────────────────────────────
const ENDPOINTS = {
  demo: {
    rest: 'https://demo.tradovateapi.com/v1',
    ws:   'wss://demo.tradovateapi.com/v1/websocket',
  },
  live: {
    rest: 'https://live.tradovateapi.com/v1',
    ws:   'wss://live.tradovateapi.com/v1/websocket',
  },
}

// ── Types internes ─────────────────────────────────────────────────────────────
interface PositionState {
  id: number
  contractId: number
  netPos: number     // + = long, - = short
  netPrice: number   // avg entry price
  openedAt: string   // ISO timestamp of first sight
}

interface TradovateMsg {
  s?: number          // status code (200 = ok)
  i?: number          // request id
  e?: string          // event type
  d?: Record<string, unknown>
}

// ── Client ─────────────────────────────────────────────────────────────────────
export class TradovateClient {
  private ws: WebSocket | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private readonly MAX_RETRIES = 10
  private readonly HEARTBEAT_MS = 2500
  private readonly RECONNECT_MS = 5000

  private accessToken: string | null = null
  private openPositions = new Map<number, PositionState>()
  private contracts     = new Map<number, string>()   // contractId → symbol
  private seenTrades    = new Set<string>()           // dedup: `${symbol}|${entry_time}`

  public lastSyncAt: Date | null = null
  public accountId: number | null = null
  private reqId = 2

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(
    public readonly userId: string,
    private readonly isDemo: boolean,
    private readonly caldraApiKey: string,
    private readonly supabase: any,
  ) {}

  // ── Auth ────────────────────────────────────────────────────────────────────

  async authenticate(username: string, password: string, tradovateApiKey: string): Promise<{ accessToken: string; accountId: number | null }> {
    const base = this.isDemo ? ENDPOINTS.demo.rest : ENDPOINTS.live.rest
    const res = await fetch(`${base}/auth/accesstokenrequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: username,
        password,
        appId: 'CaldraSession',
        appVersion: '1.0.0',
        cid: 0,
        sec: tradovateApiKey,
      }),
    })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Tradovate auth failed (${res.status}): ${txt}`)
    }

    const data = await res.json() as { accessToken?: string; p?: { id?: number }[] }
    if (!data.accessToken) throw new Error('Tradovate: pas de access_token dans la réponse')

    this.accessToken = data.accessToken
    this.accountId = data.p?.[0]?.id ?? null
    console.log(`[Tradovate][${this.userId}] Authentifié — account_id=${this.accountId}`)
    return { accessToken: this.accessToken, accountId: this.accountId }
  }

  // ── WebSocket ───────────────────────────────────────────────────────────────

  connect(token?: string) {
    if (token) this.accessToken = token
    if (!this.accessToken) throw new Error('Tradovate: pas de access_token pour ouvrir le WebSocket')
    this._connect()
  }

  private _connect() {
    const url = this.isDemo ? ENDPOINTS.demo.ws : ENDPOINTS.live.ws
    const ws = new WebSocket(url)
    this.ws = ws

    ws.on('open', () => {
      console.log(`[Tradovate][${this.userId}] WebSocket connecté`)
      this.reconnectAttempts = 0
      // Authentification via frame texte SockJS
      ws.send(`authorize\n0\n\n${JSON.stringify({ accessToken: this.accessToken })}`)
      // Heartbeat toutes les 2.5s
      this.heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('[]')
      }, this.HEARTBEAT_MS)
    })

    ws.on('message', (data) => {
      this.handleRawMessage(data.toString()).catch(err =>
        console.error(`[Tradovate][${this.userId}] handleMessage error:`, err)
      )
    })

    ws.on('close', (code, reason) => {
      console.warn(`[Tradovate][${this.userId}] WebSocket fermé (${code} ${reason.toString()})`)
      this.clearHeartbeat()
      this.scheduleReconnect()
    })

    ws.on('error', (err) => {
      console.error(`[Tradovate][${this.userId}] WebSocket erreur:`, err.message)
    })
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return // déjà planifié
    if (this.reconnectAttempts >= this.MAX_RETRIES) {
      console.error(`[Tradovate][${this.userId}] Max tentatives atteint (${this.MAX_RETRIES}) — abandon`)
      return
    }
    this.reconnectAttempts++
    console.log(`[Tradovate][${this.userId}] Reconnexion dans ${this.RECONNECT_MS / 1000}s (tentative ${this.reconnectAttempts}/${this.MAX_RETRIES})`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this._connect()
    }, this.RECONNECT_MS)
  }

  // ── Parsing des messages SockJS ─────────────────────────────────────────────

  private async handleRawMessage(raw: string) {
    // SockJS frames : 'o' open, 'h' heartbeat, 'a[...]' array, 'c[...]' close
    if (raw === 'o' || raw === 'h' || raw === '[]') return

    if (raw.startsWith('a')) {
      let frames: string[]
      try { frames = JSON.parse(raw.slice(1)) } catch { return }
      for (const frame of frames) {
        let msg: TradovateMsg
        try { msg = JSON.parse(frame) } catch { continue }
        await this.handleMessage(msg)
      }
    }
  }

  private async handleMessage(msg: TradovateMsg) {
    // Réponse à l'authorize
    if (msg.s === 200 && msg.i === 0) {
      console.log(`[Tradovate][${this.userId}] Autorisé — demande syncrequest`)
      this.ws?.send(`user/syncrequest\n${this.reqId++}\n\n{}`)
      return
    }

    const evt = msg.e ?? ''
    const data = msg.d as Record<string, unknown> ?? {}

    // Sync initial (état complet du compte)
    if (evt === 'user/syncrequest' || (msg.s === 200 && data.position)) {
      await this.processSyncData(data)
    }

    // Mises à jour incrémentielles
    if (evt === 'md' || evt === 'props') {
      await this.processSyncData(data)
    }
  }

  private async processSyncData(data: Record<string, unknown>) {
    // Enregistrer les contrats (pour avoir les symboles)
    const contracts = (data.contract as Array<{ id: number; name: string }>) ?? []
    for (const c of contracts) {
      this.contracts.set(c.id, c.name)
    }

    // Enregistrer les positions ouvertes
    const positions = (data.position as Array<{
      id: number; contractId: number; netPos: number; netPrice: number
    }>) ?? []

    for (const pos of positions) {
      const prev = this.openPositions.get(pos.id)

      if (!prev && pos.netPos !== 0) {
        // Nouvelle position ouverte
        this.openPositions.set(pos.id, {
          id: pos.id,
          contractId: pos.contractId,
          netPos: pos.netPos,
          netPrice: pos.netPrice,
          openedAt: new Date().toISOString(),
        })
        const sym = this.contracts.get(pos.contractId) ?? `CTR_${pos.contractId}`
        console.log(`[Tradovate][${this.userId}] Position ouverte : ${sym} × ${pos.netPos} @ ${pos.netPrice}`)
        continue
      }

      if (prev && pos.netPos === 0) {
        // Position fermée
        this.openPositions.delete(pos.id)
        await this.onPositionClosed(prev, pos as Record<string, number>)
        continue
      }

      if (prev && pos.netPos !== 0) {
        // Mise à jour (scale-in / scale-out partiel)
        this.openPositions.set(pos.id, { ...prev, netPos: pos.netPos, netPrice: pos.netPrice })
      }
    }
  }

  // ── Clôture de position ─────────────────────────────────────────────────────

  private async onPositionClosed(prev: PositionState, closed: Record<string, number>) {
    const symbol    = this.contracts.get(prev.contractId) ?? `CTR_${prev.contractId}`
    const direction = prev.netPos > 0 ? 'long' : 'short'
    const size      = Math.abs(prev.netPos)
    const exitPrice = closed.netPrice ?? closed.exitPrice ?? prev.netPrice
    const pnl       = closed.realizedPnl ?? 0
    const exitTime  = new Date().toISOString()

    // Déduplication : éviter les doubles envois (même symbol + entry_time)
    const dedupKey = `${symbol}|${prev.openedAt}`
    if (this.seenTrades.has(dedupKey)) {
      console.log(`[Tradovate][${this.userId}] Trade déjà ingéré (skip) : ${dedupKey}`)
      return
    }

    // Vérifier en base si ce trade existe déjà
    const { data: existing } = await this.supabase
      .from('trades')
      .select('id')
      .eq('user_id', this.userId)
      .eq('symbol', symbol)
      .eq('entry_time', prev.openedAt)
      .limit(1)
      .single()

    if (existing) {
      console.log(`[Tradovate][${this.userId}] Trade déjà en base (skip) : ${dedupKey}`)
      this.seenTrades.add(dedupKey)
      return
    }

    const trade = {
      symbol,
      direction,
      size,
      entry_price: prev.netPrice,
      exit_price: exitPrice,
      entry_time: prev.openedAt,
      exit_time: exitTime,
      pnl,
    }

    console.log(`[Tradovate][${this.userId}] Position fermée → Caldra :`, JSON.stringify(trade))
    await this.ingestTrade(trade, dedupKey)
  }

  // ── Envoi vers Caldra ───────────────────────────────────────────────────────

  private async ingestTrade(trade: object, dedupKey: string) {
    const url = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/ingest`
      : 'https://getcaldra.com/api/ingest'

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-caldra-key': this.caldraApiKey,
        },
        body: JSON.stringify(trade),
      })
      const body = await res.json() as { success?: boolean; trade_id?: string; error?: string }

      if (res.ok && body.success) {
        console.log(`[Tradovate][${this.userId}] ✓ Ingéré → trade_id=${body.trade_id}`)
        this.seenTrades.add(dedupKey)
        this.lastSyncAt = new Date()
        // Mettre à jour last_sync_at en base
        await this.supabase
          .from('tradovate_connections')
          .update({ last_sync_at: this.lastSyncAt.toISOString() })
          .eq('user_id', this.userId)
      } else {
        console.error(`[Tradovate][${this.userId}] ✗ Ingest HTTP ${res.status}:`, body.error ?? body)
      }
    } catch (err) {
      console.error(`[Tradovate][${this.userId}] ✗ Ingest réseau:`, err)
    }
  }

  // ── Déconnexion ─────────────────────────────────────────────────────────────

  disconnect() {
    this.clearHeartbeat()
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    this.reconnectAttempts = this.MAX_RETRIES // empêche toute reconnexion
    if (this.ws) {
      this.ws.removeAllListeners()
      if (this.ws.readyState === WebSocket.OPEN) this.ws.close()
      this.ws = null
    }
    console.log(`[Tradovate][${this.userId}] Déconnecté`)
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
