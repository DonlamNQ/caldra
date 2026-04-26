import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  await service
    .from('ctrader_connections')
    .update({ is_active: false, caldra_api_key: '' })
    .eq('user_id', user.id)

  console.log(`[cTrader][disconnect] user=${user.id} déconnecté`)
  return NextResponse.json({ success: true })
}
