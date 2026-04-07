import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { tradovateManager } from '@/lib/tradovate/manager'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Couper le WebSocket
  tradovateManager.stop(user.id)

  // Marquer inactif en base
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  await service
    .from('tradovate_connections')
    .update({ is_active: false, access_token: null })
    .eq('user_id', user.id)

  console.log(`[Tradovate][disconnect] user=${user.id} déconnecté`)
  return NextResponse.json({ success: true })
}
