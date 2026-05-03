import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ctraderClient } from '@/lib/ctrader'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcaldra.com'}/login?next=/dashboard?tab=integrations`
    )
  }

  const authUrl = ctraderClient.getAuthUrl(user.id)
  return NextResponse.redirect(authUrl)
}
