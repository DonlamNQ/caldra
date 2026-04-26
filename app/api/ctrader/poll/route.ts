export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ctraderClient } from '@/lib/ctrader'
import { analyzeTradeForAlerts } from '@/lib/engine'

const CTRADER_API_BASE = 'https://api.spotware.com/connect'

export async function GET(_req: NextRequest) {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: connections, error: connErr } = await service
    .from('ctrader_connections')
    .select('*')
    .eq('is_active', true)

  if (connErr) {
    console.error('[poll] DB error:', connErr)
    return NextResponse.json({ error: connErr.message }, { status: 500 })
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({ ok: true, deals: 0, connections: 0 })
  }

  let totalDeals = 0
  let totalErrors = 0
  const errorDetails: string[] = []

  for (const conn of connections) {
    try {
      let accessToken  = conn.access_token
      let refreshToken = conn.refresh_token

      // Refresh token si expiration dans moins de 5 min
      if (conn.expires_at && new Date(conn.expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
        try {
          const refreshed = await ctraderClient.refreshAccessToken(conn.refresh_token)
          accessToken  = refreshed.accessToken
          refreshToken = refreshed.refreshToken
          await service.from('ctrader_connections').update({
            access_token:  accessToken,
            refresh_token: refreshToken,
            expires_at:    new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
          }).eq('user_id', conn.user_id)
        } catch (refreshErr) {
          const msg = `Token refresh failed: ${refreshErr instanceof Error ? refreshErr.message : String(refreshErr)}`
          errorDetails.push(msg)
          totalErrors++
          continue
        }
      }

      // Vérifie token + récupère le vrai account_id depuis l'API
      const accountsCheck = await fetch(
        `${CTRADER_API_BASE}/tradingaccounts?oauth_token=${accessToken}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!accountsCheck.ok) {
        errorDetails.push(`Token invalide (${accountsCheck.status}) — reconnecte cTrader depuis /settings/integrations`)
        totalErrors++
        continue
      }
      const accountsData = await accountsCheck.json()
      const accounts: any[] = Array.isArray(accountsData) ? accountsData : (accountsData.data ?? [])
      // Utilise le vrai accountId retourné par l'API (peut différer de ce qui est stocké)
      const liveAccountId = accounts[0]?.accountId ?? conn.account_id

      // Deals depuis last_polled_at - 60s (overlap), ou les 2 dernières minutes si premier poll
      const fromTs = conn.last_polled_at
        ? new Date(conn.last_polled_at).getTime() - 60_000
        : Date.now() - 2 * 60 * 1000
      const toTs = Date.now()

      // Teste plusieurs variantes d'URL pour trouver le bon endpoint
      const urlCandidates = [
        `${CTRADER_API_BASE}/tradingaccounts/${liveAccountId}/deals?oauth_token=${accessToken}&from=${fromTs}&to=${toTs}`,
        `${CTRADER_API_BASE}/tradingaccounts/${liveAccountId}/deals?oauth_token=${accessToken}`,
        `${CTRADER_API_BASE}/tradingaccounts/${liveAccountId}/orders?oauth_token=${accessToken}`,
        `${CTRADER_API_BASE}/tradingaccounts/${liveAccountId}?oauth_token=${accessToken}`,
      ]

      let dealsRes: Response | null = null
      let workingUrl = ''
      for (const url of urlCandidates) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
        errorDetails.push(`${url.split('?')[0].split('/').slice(-2).join('/')}: ${r.status}`)
        if (r.ok) { dealsRes = r; workingUrl = url; break }
      }

      if (!dealsRes) {
        totalErrors++
        continue
      }
      errorDetails.push(`working: ${workingUrl.split('?')[0]}`)

      const raw = await dealsRes.json()
      const deals: any[] = Array.isArray(raw) ? raw : (raw.data ?? raw.deal ?? [])

      for (const deal of deals) {
        if (deal.dealStatus !== 'FULLY_FILLED') continue

        const dealId = String(deal.dealId)

        // Déduplication
        const { data: existing } = await service
          .from('trades')
          .select('id')
          .eq('user_id', conn.user_id)
          .eq('ctrader_deal_id', dealId)
          .maybeSingle()

        if (existing) continue

        const tradePayload = {
          user_id:         conn.user_id,
          symbol:          deal.symbolName,
          direction:       deal.tradeSide === 'BUY' ? 'long' : 'short' as 'long' | 'short',
          size:            (deal.filledVolume ?? deal.volume ?? 0) / 100,
          entry_price:     deal.executionPrice ?? 0,
          exit_price:      deal.closeExecutionPrice ?? deal.executionPrice ?? 0,
          entry_time:      new Date(deal.createTimestamp).toISOString(),
          exit_time:       new Date(deal.executionTimestamp).toISOString(),
          pnl:             (deal.grossProfit ?? 0) / 100,
          ctrader_deal_id: dealId,
        }

        const { data: inserted, error: insertErr } = await service
          .from('trades')
          .insert(tradePayload)
          .select()
          .single()

        if (insertErr) {
          console.error(`[poll] Insert failed deal=${dealId}:`, insertErr)
          totalErrors++
          continue
        }

        try {
          await analyzeTradeForAlerts(inserted)
        } catch (engineErr) {
          console.error(`[poll] Engine error deal=${dealId}:`, engineErr)
        }

        totalDeals++
        console.log(`[poll] Deal ${dealId} ingéré — user=${conn.user_id} symbol=${deal.symbolName} pnl=${tradePayload.pnl}`)
      }

      await service
        .from('ctrader_connections')
        .update({ last_polled_at: new Date().toISOString() })
        .eq('user_id', conn.user_id)

    } catch (err) {
      const msg = `Unexpected error user=${conn.user_id}: ${err instanceof Error ? err.message : String(err)}`
      errorDetails.push(msg)
      totalErrors++
    }
  }

  return NextResponse.json({
    ok:          true,
    connections: connections.length,
    deals:       totalDeals,
    errors:      totalErrors,
    errorDetails,
    ts:          new Date().toISOString(),
  })
}
