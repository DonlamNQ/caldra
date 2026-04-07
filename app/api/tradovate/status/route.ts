import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { tradovateManager } from '@/lib/tradovate/manager'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: conn } = await service
    .from('tradovate_connections')
    .select('account_id, is_demo, is_active, last_sync_at, tradovate_username')
    .eq('user_id', user.id)
    .single()

  const wsConnected = tradovateManager.isConnected(user.id)
  const lastSyncAt  = tradovateManager.lastSyncAt(user.id)

  return NextResponse.json({
    isConnected:  wsConnected && (conn?.is_active ?? false),
    wsAlive:      wsConnected,
    accountId:    conn?.account_id ?? null,
    isDemo:       conn?.is_demo ?? true,
    username:     conn?.tradovate_username ?? null,
    lastSyncAt:   lastSyncAt?.toISOString() ?? conn?.last_sync_at ?? null,
    dbActive:     conn?.is_active ?? false,
  })
}
