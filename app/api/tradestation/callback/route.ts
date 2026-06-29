export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createSessionClient } from '@/lib/supabase/server'
import { createHash, randomBytes } from 'crypto'
import { encryptSecret } from '@/lib/secretCrypto'

const service = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const errorRedirect = `${appUrl}/dashboard?tradestation=error`

  if (!code) return NextResponse.redirect(`${errorRedirect}&reason=missing_code`)

  // CSRF : le `state` renvoyé doit correspondre au nonce déposé en cookie au connect.
  // L'identité vient de la session ou, à défaut, du cookie httpOnly (de confiance).
  const sessionClient = await createSessionClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  const returnedState = searchParams.get('state')
  const cookie = req.cookies.get('tradestation_oauth')?.value
  let userId: string | null = null
  if (cookie && returnedState) {
    const [nonce, uid] = cookie.split('.')
    if (nonce && returnedState === nonce) userId = user?.id ?? uid
  }
  if (!userId) return NextResponse.redirect(`${errorRedirect}&reason=invalid_state`)

  try {
    const tokenRes = await fetch('https://signin.tradestation.com/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.TRADESTATION_CLIENT_ID!,
        client_secret: process.env.TRADESTATION_CLIENT_SECRET!,
        code,
        redirect_uri: `${appUrl}/api/tradestation/callback`,
      }),
    })
    const raw = await tokenRes.text()
    let json: any = {}
    try { json = JSON.parse(raw) } catch {}

    const accessToken = json.access_token
    const refreshToken = json.refresh_token ?? null
    const expiresIn = json.expires_in ?? 1200
    if (!accessToken) {
      console.error('[tradestation/callback] token exchange échoué', tokenRes.status, raw)
      return NextResponse.redirect(`${errorRedirect}&reason=${encodeURIComponent(json.error || `http_${tokenRes.status}`)}`)
    }

    const db = service()
    const plain     = `cal_${randomBytes(20).toString('hex')}`
    const keyHash   = createHash('sha256').update(plain).digest('hex')
    const keyPrefix = `${plain.slice(0, 12)}...`

    await db.from('api_keys').delete().eq('user_id', userId).eq('label', 'TradeStation')
    await db.from('api_keys').insert({ user_id: userId, key_hash: keyHash, key_prefix: keyPrefix, label: 'TradeStation' })

    await db.from('tradestation_accounts').delete().eq('user_id', userId)
    await db.from('tradestation_accounts').insert({
      user_id:           userId,
      access_token_enc:  encryptSecret(accessToken),
      refresh_token_enc: refreshToken ? encryptSecret(refreshToken) : null,
      token_expires_at:  new Date(Date.now() + expiresIn * 1000).toISOString(),
      ingest_key:        plain,
      status:            null,   // le worker résout les comptes + passe à 'connected'
    })

    const okRes = NextResponse.redirect(`${appUrl}/dashboard?tradestation=connected`)
    okRes.cookies.delete('tradestation_oauth')
    return okRes
  } catch (e: any) {
    console.error('[tradestation/callback]', e)
    return NextResponse.redirect(`${errorRedirect}&reason=${encodeURIComponent('exception:' + (e?.message ?? ''))}`)
  }
}
