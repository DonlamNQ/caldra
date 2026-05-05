export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ctraderClient } from '@/lib/ctrader'
import { analyzeTradeForAlerts } from '@/lib/engine'

const CTRADER_API_BASE = 'https://api.spotware.com/connect'

// Essaie plusieurs variantes d'endpoints deals — retourne { status, deals[] } pour le premier qui répond
async function fetchDeals(accountId: string, accessToken: string): Promise<{ endpoint: string; status: number; deals: any[]; raw: unknown }> {
  const fromMs = Date.now() - 24 * 60 * 60 * 1000
  const toMs   = Date.now()
  const qs     = `oauth_token=${accessToken}&from=${fromMs}&to=${toMs}`

  const candidates = [
    `${CTRADER_API_BASE}/tradingaccounts/${accountId}/history?${qs}`,
    `${CTRADER_API_BASE}/tradingaccounts/${accountId}/deals?${qs}`,
    `${CTRADER_API_BASE}/tradingaccounts/${accountId}/history/deals?${qs}`,
  ]

  for (const url of candidates) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    const text = await res.text()
    let raw: unknown = text
    try { raw = JSON.parse(text) } catch {}

    if (res.ok) {
      const deals: any[] = Array.isArray(raw) ? raw : ((raw as any)?.data ?? (raw as any)?.deal ?? (raw as any)?.deals ?? (raw as any)?.history ?? [])
      return { endpoint: url.replace(CTRADER_API_BASE, '').split('?')[0], status: res.status, deals, raw }
    }

    // 404 = essaie le suivant ; autre erreur = stop
    if (res.status !== 404) {
      return { endpoint: url.replace(CTRADER_API_BASE, '').split('?')[0], status: res.status, deals: [], raw }
    }
  }

  return { endpoint: 'none', status: 404, deals: [], raw: null }
}

export async function GET(_req: NextRequest) {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: connections, error: connErr } = await service
    .from('ctrader_connections')
    .select('*')
    .eq('is_active', true)

  if (connErr) return NextResponse.json({ error: connErr.message }, { status: 500 })
  if (!connections || connections.length === 0) return NextResponse.json({ ok: true, deals: 0, connections: 0 })

  let totalDeals  = 0
  let totalErrors = 0
  const diagnostics: unknown[] = []

  for (const conn of connections) {
    try {
      let accessToken  = conn.access_token
      let refreshToken = conn.refresh_token

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
          totalErrors++
          continue
        }
      }

      const { endpoint, status, deals, raw } = await fetchDeals(conn.account_id, accessToken)
      diagnostics.push({ accountId: conn.account_id, endpoint, status, dealsFound: deals.length, rawSample: JSON.stringify(raw)?.slice(0, 300) })

      if (status !== 200) {
        console.error(`[poll] cTrader API ${status} endpoint=${endpoint} user=${conn.user_id}`)
        totalErrors++
        continue
      }

      for (const deal of deals) {
        if (deal.dealStatus !== 'FULLY_FILLED') continue

        const dealId = String(deal.dealId ?? deal.id)

        const { data: existing } = await service
          .from('trades')
          .select('id')
          .eq('user_id', conn.user_id)
          .eq('ctrader_deal_id', dealId)
          .maybeSingle()

        if (existing) continue

        const tradePayload = {
          user_id:         conn.user_id,
          symbol:          deal.symbolName ?? deal.symbol,
          direction:       deal.tradeSide === 'BUY' ? 'long' : 'short' as 'long' | 'short',
          size:            (deal.filledVolume ?? deal.volume ?? 0) / 100,
          entry_price:     deal.executionPrice ?? 0,
          exit_price:      deal.closeExecutionPrice ?? deal.executionPrice ?? 0,
          entry_time:      new Date(deal.createTimestamp ?? deal.executionTimestamp).toISOString(),
          exit_time:       new Date(deal.executionTimestamp ?? deal.createTimestamp).toISOString(),
          pnl:             (deal.grossProfit ?? deal.netProfit ?? 0) / 100,
          ctrader_deal_id: dealId,
        }

        const { data: inserted, error: insertErr } = await service
          .from('trades').insert(tradePayload).select().single()

        if (insertErr) {
          console.error(`[poll] Insert failed deal=${dealId}:`, insertErr)
          totalErrors++
          continue
        }

        try { await analyzeTradeForAlerts(inserted) } catch {}

        totalDeals++
        console.log(`[poll] Deal ${dealId} ingéré — user=${conn.user_id} symbol=${tradePayload.symbol} pnl=${tradePayload.pnl}`)
      }

      await service.from('ctrader_connections')
        .update({ last_polled_at: new Date().toISOString() })
        .eq('user_id', conn.user_id)

    } catch (err) {
      console.error(`[poll] Erreur user=${conn.user_id}:`, err)
      totalErrors++
    }
  }

  return NextResponse.json({
    ok:          true,
    connections: connections.length,
    deals:       totalDeals,
    errors:      totalErrors,
    diagnostics,
    ts:          new Date().toISOString(),
  })
}
