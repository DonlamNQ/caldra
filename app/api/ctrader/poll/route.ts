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

      // Deals depuis last_polled_at - 60s (overlap), ou les 2 dernières minutes si premier poll
      const fromTs = conn.last_polled_at
        ? new Date(conn.last_polled_at).getTime() - 60_000
        : Date.now() - 2 * 60 * 1000

      const dealsRes = await fetch(
        `${CTRADER_API_BASE}/tradingaccounts/${conn.account_id}/deals?oauth_token=${accessToken}&from=${fromTs}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!dealsRes.ok) {
        const body = await dealsRes.text()
        const msg = `cTrader API ${dealsRes.status} user=${conn.user_id}: ${body.slice(0, 200)}`
        errorDetails.push(msg)
        totalErrors++
        continue
      }

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
