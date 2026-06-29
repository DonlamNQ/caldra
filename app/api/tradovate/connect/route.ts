export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

// OAuth Tradovate — autorisation. L'utilisateur est redirigé vers le consentement
// Tradovate, qui rappelle /api/tradovate/callback avec un code.
// Endpoint vérifié : https://trader.tradovate.com/oauth (response_type=code).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)
  }

  // CSRF : `state` = nonce aléatoire (PAS le user.id, qui serait devinable). Le nonce + le
  // user.id sont déposés dans un cookie httpOnly, vérifiés au callback (anti-CSRF OAuth).
  const nonce = randomBytes(16).toString('hex')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TRADOVATE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/tradovate/callback`,
    state: nonce,
  })

  const res = NextResponse.redirect(`https://trader.tradovate.com/oauth?${params}`)
  res.cookies.set('tradovate_oauth', `${nonce}.${user.id}`, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600,
  })
  return res
}
