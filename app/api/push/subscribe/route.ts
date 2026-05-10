export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint, p256dh, auth } = await req.json()
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Remove stale subs from the same push provider to avoid accumulation
  try {
    const providerHost = new URL(endpoint).hostname
    await supabase.from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .like('endpoint', `%${providerHost}%`)
      .neq('endpoint', endpoint)
  } catch {}

  await supabase.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint, p256dh, auth },
    { onConflict: 'user_id,endpoint' }
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await req.json()
  if (endpoint) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    await supabase.from('push_subscriptions').delete()
      .eq('user_id', user.id).eq('endpoint', endpoint)
  }

  return NextResponse.json({ ok: true })
}
