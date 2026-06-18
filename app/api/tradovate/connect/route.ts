export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// OAuth Tradovate — autorisation. L'utilisateur est redirigé vers le consentement
// Tradovate, qui rappelle /api/tradovate/callback avec un code.
// Endpoint vérifié : https://trader.tradovate.com/oauth (response_type=code).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TRADOVATE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/tradovate/callback`,
    // Tradovate n'exige pas state, mais on le passe en fallback d'identification user.
    state: user.id,
  })

  return NextResponse.redirect(
    `https://trader.tradovate.com/oauth?${params}`
  )
}
