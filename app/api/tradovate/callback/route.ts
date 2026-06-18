export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createSessionClient } from '@/lib/supabase/server'
import { createHash, randomBytes } from 'crypto'

const service = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

// Endpoint token vérifié : https://live.tradovateapi.com/auth/oauthtoken (POST).
const TOKEN_URL = process.env.TRADOVATE_TOKEN_URL || 'https://live.tradovateapi.com/auth/oauthtoken'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')

  const appUrl        = process.env.NEXT_PUBLIC_APP_URL!
  const errorRedirect = `${appUrl}/dashboard?tradovate=error`

  if (!code) return NextResponse.redirect(`${errorRedirect}&reason=missing_code`)

  // Identification du user : session Supabase (callback dans son navigateur), fallback state.
  const sessionClient = await createSessionClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  const userId = user?.id ?? searchParams.get('state')

  if (!userId) return NextResponse.redirect(`${errorRedirect}&reason=no_session`)

  try {
    // Échange code → access_token (form-urlencoded, comme attendu par Tradovate).
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     process.env.TRADOVATE_CLIENT_ID!,
      client_secret: process.env.TRADOVATE_CLIENT_SECRET!,
      redirect_uri:  `${appUrl}/api/tradovate/callback`,
    })

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: body.toString(),
    })
    const raw = await tokenRes.text()
    let json: any = {}
    try { json = JSON.parse(raw) } catch {}

    // Tradovate renvoie access_token + expires_in (camelCase accessToken/expirationTime selon endpoint).
    const accessToken = json.access_token ?? json.accessToken
    const expiresIn   = Number(json.expires_in ?? 0)
    const expiresAtIso = json.expirationTime ?? (expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null)

    if (!accessToken) {
      console.error('[tradovate/callback] token exchange échoué', tokenRes.status, raw)
      const reason = json.error_description || json.errorText || `http_${tokenRes.status}`
      return NextResponse.redirect(`${errorRedirect}&reason=${encodeURIComponent(reason)}`)
    }

    const db = service()

    // Clé d'ingest dédiée à cette connexion Tradovate.
    const plain     = `cal_${randomBytes(20).toString('hex')}`
    const keyHash   = createHash('sha256').update(plain).digest('hex')
    const keyPrefix = `${plain.slice(0, 12)}...`

    await db.from('api_keys').delete().eq('user_id', userId).eq('label', 'Tradovate')
    await db.from('api_keys').insert({
      user_id: userId, key_hash: keyHash, key_prefix: keyPrefix, label: 'Tradovate',
    })

    // État propre : un nouveau token couvre les comptes du user → on remplace ses lignes.
    // Le worker re-résout tradovate_account_id / environment.
    await db.from('tradovate_accounts').delete().eq('user_id', userId)
    await db.from('tradovate_accounts').insert({
      user_id:          userId,
      environment:      'live',
      access_token:     accessToken,
      token_expires_at: expiresAtIso,
      ingest_key:       plain,
    })

    return NextResponse.redirect(`${appUrl}/dashboard?tradovate=connected`)
  } catch (e: any) {
    console.error('[tradovate/callback]', e)
    return NextResponse.redirect(`${errorRedirect}&reason=${encodeURIComponent('exception:' + (e?.message ?? ''))}`)
  }
}
