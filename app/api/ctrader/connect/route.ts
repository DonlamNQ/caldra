export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)
  }

  const params = new URLSearchParams({
    client_id: process.env.CTRADER_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/ctrader/callback`,
    scope: 'accounts',
    state: user.id,
  })

  return NextResponse.redirect(
    `https://openapi.ctrader.com/apps/auth?${params}`
  )
}
