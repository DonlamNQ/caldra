import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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
    .select('account_id, account_name, is_active, caldra_api_key, last_polled_at')
    .eq('user_id', user.id)
    .single()

  // polling = connexion active + clé API configurée + dernier poll < 2 min
  const lastPoll = conn?.last_polled_at ? new Date(conn.last_polled_at) : null
  const polling  = !!(
    conn?.is_active &&
    conn?.caldra_api_key?.startsWith('cal_') &&
    lastPoll &&
    Date.now() - lastPoll.getTime() < 2 * 60 * 1000
  )

  return NextResponse.json({
    connected:       !!(conn?.is_active),
    polling,
    accountId:       conn?.account_id ?? null,
    accountName:     conn?.account_name ?? null,
    needsActivation: conn && !conn.is_active,
    hasApiKey:       !!(conn?.caldra_api_key?.startsWith('cal_')),
    lastPolledAt:    conn?.last_polled_at ?? null,
  })
}
