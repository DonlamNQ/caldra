export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const BASE = 'https://api.spotware.com/connect'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: conn } = await service
    .from('ctrader_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!conn) return NextResponse.json({ error: 'Aucune connexion cTrader trouvée' })

  const token     = conn.access_token
  const accountId = conn.account_id
  const fromMs    = Date.now() - 24 * 60 * 60 * 1000
  const toMs      = Date.now()

  const results: Record<string, unknown> = {
    connection: { accountId, accountName: conn.account_name, isActive: conn.is_active },
  }

  // Test plusieurs variantes d'endpoints
  const endpoints = [
    `${BASE}/tradingaccounts/${accountId}/deals?oauth_token=${token}&from=${fromMs}&to=${toMs}`,
    `${BASE}/tradingaccounts/${accountId}/history?oauth_token=${token}&from=${fromMs}&to=${toMs}`,
    `${BASE}/tradingaccounts/${accountId}/history/deals?oauth_token=${token}&from=${fromMs}&to=${toMs}`,
    `${BASE}/tradingaccounts?oauth_token=${token}`,
  ]

  for (const url of endpoints) {
    const label = url.replace(token, 'TOKEN').replace(BASE, '')
    try {
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const text = await res.text()
      let body: unknown = text
      try { body = JSON.parse(text) } catch {}
      results[label] = { status: res.status, body }
    } catch (err) {
      results[label] = { error: String(err) }
    }
  }

  return NextResponse.json(results, { status: 200 })
}
