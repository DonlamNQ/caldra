export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Démarre le flux OAuth TradeStation (modèle cTrader). Nécessite l'app enregistrée chez
// TradeStation → TRADESTATION_CLIENT_ID + secret côté serveur.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)

  const clientId = process.env.TRADESTATION_CLIENT_ID
  if (!clientId) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tradestation=error&reason=not_configured`)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/tradestation/callback`,
    audience: 'https://api.tradestation.com',
    // ReadAccount = lecture des comptes/ordres ; offline_access = refresh token.
    scope: 'openid profile offline_access ReadAccount',
    state: user.id,
  })

  return NextResponse.redirect(`https://signin.tradestation.com/authorize?${params}`)
}
