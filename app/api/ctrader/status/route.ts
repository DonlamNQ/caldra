import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ctraderManager } from '@/lib/ctrader-manager'

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
    .select('account_id, account_name, is_active, caldra_api_key, expires_at')
    .eq('user_id', user.id)
    .single()

  const polling = ctraderManager.isPolling(user.id)

  return NextResponse.json({
    connected:       !!(conn?.is_active),
    polling,
    accountId:       conn?.account_id ?? null,
    accountName:     conn?.account_name ?? null,
    needsActivation: conn && !conn.is_active,
    hasApiKey:       !!(conn?.caldra_api_key && conn.caldra_api_key.startsWith('cal_')),
  })
}
