// lib/ctrader.ts — cTrader Open API client (OAuth2 + polling REST)

const CTRADER_AUTH_URL  = 'https://connect.spotware.com/apps/auth'
const CTRADER_TOKEN_URL = 'https://connect.spotware.com/apps/token'
const CTRADER_API_BASE  = 'https://api.spotware.com/connect'

export interface CTraderTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface CTraderAccount {
  accountId: string
  accountName: string
  depositCurrency: string
  isLive: boolean
}

export interface CTraderDeal {
  dealId: string
  orderId: string
  positionId: string
  tradeSide: 'BUY' | 'SELL'
  symbolName: string
  volume: number
  filledVolume: number
  executionPrice: number
  closeExecutionPrice?: number
  createTimestamp: number
  executionTimestamp: number
  grossProfit: number
  dealStatus: string
}

// Deals déjà envoyés à /api/ingest — survivent en mémoire process
const sentDealIds = new Set<string>()

export class CTraderClient {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.clientId     = process.env.CTRADER_CLIENT_ID!
    this.clientSecret = process.env.CTRADER_CLIENT_SECRET!
    this.redirectUri  = process.env.CTRADER_REDIRECT_URI
      ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcaldra.com'}/api/ctrader/callback`
  }

  /** Génère l'URL OAuth2 cTrader — state = userId pour retrouver l'user au callback */
  getAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id:     this.clientId,
      redirect_uri:  this.redirectUri,
      scope:         'trading openapi',
      response_type: 'code',
      state:         userId,
    })
    return `${CTRADER_AUTH_URL}?${params.toString()}`
  }

  /** Échange le code OAuth2 contre des tokens */
  async exchangeCode(code: string): Promise<CTraderTokens> {
    const res = await fetch(CTRADER_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  this.redirectUri,
        client_id:     this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`cTrader token exchange failed (${res.status}): ${text}`)
    }

    const data = await res.json()
    return {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token,
      expiresIn:    data.expires_in ?? 3600,
    }
  }

  /** Rafraîchit l'access token via le refresh token */
  async refreshAccessToken(refreshToken: string): Promise<CTraderTokens> {
    const res = await fetch(CTRADER_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
        client_id:     this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`cTrader token refresh failed (${res.status}): ${text}`)
    }

    const data = await res.json()
    return {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn:    data.expires_in ?? 3600,
    }
  }

  /** Liste les comptes cTrader liés à ce token */
  async getAccounts(accessToken: string): Promise<CTraderAccount[]> {
    const res = await fetch(`${CTRADER_API_BASE}/tradingaccounts?oauth_token=${accessToken}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`cTrader getAccounts failed (${res.status}): ${text}`)
    }

    const data = await res.json()

    // La réponse peut être un tableau direct ou { data: [...] }
    const accounts: any[] = Array.isArray(data) ? data : (data.data ?? data.accounts ?? [])

    return accounts.map((acc: any) => ({
      accountId:       String(acc.accountId ?? acc.ctidTraderAccountId ?? acc.id),
      accountName:     acc.accountName ?? acc.brokerName ?? `Account ${acc.accountId ?? acc.id}`,
      depositCurrency: acc.depositCurrency ?? 'USD',
      isLive:          acc.isLive ?? false,
    }))
  }

  /**
   * Démarre un polling toutes les 10 secondes pour récupérer les deals fermés.
   * Formate chaque nouveau deal et le POST vers /api/ingest.
   * Tourne en mémoire process Next.js (MVP — migrer vers worker plus tard).
   */
  streamDeals(
    accessToken: string,
    refreshToken: string,
    accountId: string,
    userId: string,
    caldraApiKey: string,
    ingestBaseUrl: string,
  ): NodeJS.Timeout {
    let currentAccessToken  = accessToken
    let currentRefreshToken = refreshToken
    let tokenExpiresAt      = Date.now() + 3600 * 1000 // conservateur

    const poll = async () => {
      try {
        // Rafraîchit le token si < 5 min restantes
        if (Date.now() > tokenExpiresAt - 5 * 60 * 1000) {
          try {
            const refreshed      = await this.refreshAccessToken(currentRefreshToken)
            currentAccessToken   = refreshed.accessToken
            currentRefreshToken  = refreshed.refreshToken
            tokenExpiresAt       = Date.now() + refreshed.expiresIn * 1000
            console.log(`[cTrader] Token rafraîchi pour user=${userId}`)
          } catch (refreshErr) {
            console.error(`[cTrader] Échec refresh token pour user=${userId}:`, refreshErr)
            return // Retry au prochain tick
          }
        }

        // from = il y a 30 secondes pour capturer les deals récents
        const fromTimestamp = Date.now() - 30_000
        const url = `${CTRADER_API_BASE}/tradingaccounts/${accountId}/deals?oauth_token=${currentAccessToken}&from=${fromTimestamp}`

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${currentAccessToken}` },
        })

        if (!res.ok) {
          console.error(`[cTrader] listDeals HTTP ${res.status} pour user=${userId}`)
          return
        }

        const data = await res.json()
        const deals: CTraderDeal[] = Array.isArray(data) ? data : (data.data ?? data.deal ?? [])

        for (const deal of deals) {
          // Seulement les deals entièrement exécutés et pas encore envoyés
          if (deal.dealStatus !== 'FULLY_FILLED') continue
          if (sentDealIds.has(deal.dealId)) continue

          sentDealIds.add(deal.dealId)

          const payload = {
            symbol:      deal.symbolName,
            direction:   deal.tradeSide === 'BUY' ? 'long' : 'short',
            size:        deal.filledVolume / 100,
            entry_price: deal.executionPrice,
            exit_price:  deal.closeExecutionPrice ?? deal.executionPrice,
            entry_time:  new Date(deal.createTimestamp).toISOString(),
            exit_time:   new Date(deal.executionTimestamp).toISOString(),
            pnl:         deal.grossProfit / 100,
          }

          try {
            const ingestRes = await fetch(`${ingestBaseUrl}/api/ingest`, {
              method:  'POST',
              headers: {
                'Content-Type':  'application/json',
                'x-caldra-key':  caldraApiKey,
              },
              body: JSON.stringify(payload),
            })

            if (!ingestRes.ok) {
              const errText = await ingestRes.text()
              console.error(`[cTrader] Ingest échoué pour deal=${deal.dealId}:`, errText)
              sentDealIds.delete(deal.dealId) // Permet retry
            } else {
              console.log(`[cTrader] Deal ${deal.dealId} ingéré — user=${userId} symbol=${deal.symbolName} pnl=${payload.pnl}`)
            }
          } catch (ingestErr) {
            console.error(`[cTrader] Réseau ingest deal=${deal.dealId}:`, ingestErr)
            sentDealIds.delete(deal.dealId) // Permet retry
          }
        }
      } catch (err) {
        console.error(`[cTrader] Erreur polling user=${userId}:`, err)
      }
    }

    // Premier poll immédiat, puis toutes les 10s
    poll()
    return setInterval(poll, 10_000)
  }
}

export const ctraderClient = new CTraderClient()
