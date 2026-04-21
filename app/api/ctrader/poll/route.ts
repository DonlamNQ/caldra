export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ctraderClient } from '@/lib/ctrader'

// Route appelée par le Vercel Cron Job — sécurisée par CRON_SECRET
export async function GET(req: NextRequest) {
  try {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Récupère toutes les connexions actives
  const { data: connections, error: fetchErr } = await service
    .from('ctrader_connections')
    .select('user_id, account_id, access_token, refresh_token, expires_at, caldra_api_key')
    .eq('is_active', true)

  if (fetchErr) {
    console.error('[cTrader][poll] Erreur lecture ctrader_connections:', fetchErr)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const ingestBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcaldra.com'
  let totalDeals = 0

  for (const conn of connections) {
    try {
      let accessToken  = conn.access_token
      let refreshToken = conn.refresh_token

      // Rafraîchit le token si < 5 min restantes
      const expiresAt = new Date(conn.expires_at).getTime()
      if (Date.now() > expiresAt - 5 * 60 * 1000) {
        try {
          const refreshed = await ctraderClient.refreshAccessToken(refreshToken)
          accessToken  = refreshed.accessToken
          refreshToken = refreshed.refreshToken
          const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()

          await service
            .from('ctrader_connections')
            .update({ access_token: accessToken, refresh_token: refreshToken, expires_at: newExpiresAt })
            .eq('user_id', conn.user_id)

          console.log(`[cTrader][poll] Token rafraîchi — user=${conn.user_id}`)
        } catch (refreshErr) {
          console.error(`[cTrader][poll] Échec refresh token user=${conn.user_id}:`, refreshErr)
          continue
        }
      }

      // Fetch deals des 5 dernières minutes (fenêtre large pour fiabilité)
      const fromTimestamp = Date.now() - 5 * 60 * 1000
      const toTimestamp   = Date.now()
      const dealsUrl = `https://api.spotware.com/connect/tradingaccounts/${conn.account_id}/deals` +
        `?oauth_token=${accessToken}&from=${fromTimestamp}&to=${toTimestamp}`

      const dealsRes = await fetch(dealsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!dealsRes.ok) {
        const text = await dealsRes.text()
        console.error(`[cTrader][poll] listDeals HTTP ${dealsRes.status} user=${conn.user_id}: ${text}`)
        continue
      }

      const dealsData = await dealsRes.json()
      const deals: any[] = Array.isArray(dealsData)
        ? dealsData
        : (dealsData.data ?? dealsData.deal ?? dealsData.deals ?? [])

      for (const deal of deals) {
        if (deal.dealStatus !== 'FULLY_FILLED') continue

        const entryTime = new Date(deal.createTimestamp).toISOString()
        const symbol    = deal.symbolName

        // Déduplication : vérifie si ce trade existe déjà
        const { data: existing } = await service
          .from('trades')
          .select('id')
          .eq('user_id', conn.user_id)
          .eq('symbol', symbol)
          .eq('entry_time', entryTime)
          .maybeSingle()

        if (existing) continue

        const payload = {
          symbol,
          direction:   deal.tradeSide === 'BUY' ? 'long' : 'short',
          size:        deal.filledVolume / 100,
          entry_price: deal.executionPrice,
          exit_price:  deal.closeExecutionPrice ?? deal.executionPrice,
          entry_time:  entryTime,
          exit_time:   new Date(deal.executionTimestamp).toISOString(),
          pnl:         deal.grossProfit / 100,
        }

        try {
          const ingestRes = await fetch(`${ingestBase}/api/ingest`, {
            method:  'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-caldra-key': conn.caldra_api_key,
            },
            body: JSON.stringify(payload),
          })

          if (ingestRes.ok) {
            totalDeals++
            console.log(`[cTrader][poll] Deal ingéré — user=${conn.user_id} symbol=${symbol} pnl=${payload.pnl}`)
          } else {
            const errText = await ingestRes.text()
            console.error(`[cTrader][poll] Ingest échoué user=${conn.user_id} deal=${deal.dealId}: ${errText}`)
          }
        } catch (ingestErr) {
          console.error(`[cTrader][poll] Réseau ingest user=${conn.user_id}:`, ingestErr)
        }
      }
    } catch (err) {
      console.error(`[cTrader][poll] Erreur user=${conn.user_id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, processed: totalDeals, users: connections.length })
  } catch (err) {
    console.error('[cTrader][poll] Exception non gérée:', err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
