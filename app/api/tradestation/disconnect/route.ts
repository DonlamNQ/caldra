export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const service = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = service()
  await Promise.all([
    db.from('tradestation_accounts').delete().eq('user_id', user.id),
    db.from('api_keys').delete().eq('user_id', user.id).eq('label', 'TradeStation'),
  ])

  return NextResponse.json({ success: true })
}
