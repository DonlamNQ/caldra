export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ctraderClient } from '@/lib/ctrader'
import { fetchDealsOpenAPI } from '@/lib/ctrader-openapi'
import { analyzeTradeForAlerts } from '@/lib/engine'

export async function GET() {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: connections, error: connErr } = await service
    .from('ctrader_connections')
    .select('*')
    .eq('is_active', true)

  if (connErr) return NextResponse.json({ error: connErr.message }, { status: 500 })
  if (!connections?.length) return NextResponse.json({ ok: true, deals: 0, connections: 0 })

  let totalDeals  = 0
  let totalErrors = 0
  const diagnostics: unknown[] = []

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
          console.error(`[poll] Token refresh failed user=${conn.user_id}:`, refreshErr)
          totalErrors++; continue
        }
      }

      const fromMs = Date.now() - 24 * 60 * 60 * 1000
      const toMs   = Date.now()

      let deals: Awaited<ReturnType<typeof fetchDealsOpenAPI>>
      try {
        deals = await fetchDealsOpenAPI({
          ctidTraderAccountId: Number(conn.account_id),
          accessToken,
          fromMs,
          toMs,
        })
      } catch (apiErr) {
        const msg = apiErr instanceof Error ? apiErr.message : String(apiErr)
        console.error(`[poll] OpenAPI error user=${conn.user_id}:`, msg)
        diagnostics.push({ accountId: conn.account_id, error: msg })
        totalErrors++; continue
      }

      diagnostics.push({ accountId: conn.account_id, dealsFound: deals.length })

      for (const deal of deals) {
        const { data: existing } = await service
          .from('trades').select('id')
          .eq('user_id', conn.user_id)
          .eq('ctrader_deal_id', deal.dealId)
          .maybeSingle()

        if (existing) continue

        const tradePayload = {
          user_id:         conn.user_id,
          symbol:          deal.symbol,
          direction:       deal.direction,
          size:            deal.volume / 100,       // cTrader volume / 100 = taille standard
          entry_price:     deal.entryPrice,
          exit_price:      deal.entryPrice,         // cTrader deal = une jambe, prix identique
          entry_time:      deal.entryTime,
          exit_time:       deal.exitTime,
          pnl:             deal.grossProfit / 100,  // grossProfit est × 100 dans l'API
          ctrader_deal_id: deal.dealId,
        }

        const { data: inserted, error: insertErr } = await service
          .from('trades').insert(tradePayload).select().single()

        if (insertErr) {
          console.error(`[poll] Insert failed deal=${deal.dealId}:`, insertErr.message)
          totalErrors++; continue
        }

        try { await analyzeTradeForAlerts(inserted) } catch {}

        totalDeals++
        console.log(`[poll] Deal ${deal.dealId} ingéré — user=${conn.user_id} symbol=${deal.symbol} pnl=${tradePayload.pnl}`)
      }

      await service.from('ctrader_connections')
        .update({ last_polled_at: new Date().toISOString() })
        .eq('user_id', conn.user_id)

    } catch (err) {
      console.error(`[poll] Erreur user=${conn.user_id}:`, err)
      totalErrors++
    }
  }

  return NextResponse.json({ ok: true, connections: connections.length, deals: totalDeals, errors: totalErrors, diagnostics, ts: new Date().toISOString() })
}
