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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')

  const appUrl        = process.env.NEXT_PUBLIC_APP_URL!
  const errorRedirect = `${appUrl}/dashboard?ctrader=error`

  if (!code) return NextResponse.redirect(`${errorRedirect}&reason=missing_code`)

  // cTrader ne renvoie PAS le paramètre `state`. On identifie le user via sa session
  // Supabase : le callback est appelé dans son navigateur, les cookies d'auth sont présents.
  const sessionClient = await createSessionClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  const userId = user?.id ?? searchParams.get('state')

  if (!userId) return NextResponse.redirect(`${errorRedirect}&reason=no_session`)

  try {
    // Exchange auth code for tokens
    const tokenUrl = new URL('https://openapi.ctrader.com/apps/token')
    tokenUrl.searchParams.set('grant_type', 'authorization_code')
    tokenUrl.searchParams.set('code', code)
    tokenUrl.searchParams.set('redirect_uri', `${appUrl}/api/ctrader/callback`)
    tokenUrl.searchParams.set('client_id', process.env.CTRADER_CLIENT_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.CTRADER_CLIENT_SECRET!)

    // cTrader attend un GET. En cas d'échec il renvoie souvent HTTP 200 avec errorCode/description.
    const tokenRes = await fetch(tokenUrl.toString())
    const raw = await tokenRes.text()
    let json: any = {}
    try { json = JSON.parse(raw) } catch {}

    const { accessToken, refreshToken, expiresIn, errorCode, description } = json
    if (!accessToken) {
      console.error('[ctrader/callback] token exchange échoué', tokenRes.status, raw)
      const reason = errorCode || description || `http_${tokenRes.status}`
      return NextResponse.redirect(`${errorRedirect}&reason=${encodeURIComponent(reason)}`)
    }

    const db = service()

    // Generate dedicated ingest key for this cTrader connection
    const plain     = `cal_${randomBytes(20).toString('hex')}`
    const keyHash   = createHash('sha256').update(plain).digest('hex')
    const keyPrefix = `${plain.slice(0, 12)}...`

    // Upsert cTrader-labelled api_key (replaces any previous one for this user)
    await db.from('api_keys').delete().eq('user_id', userId).eq('label', 'cTrader')
    await db.from('api_keys').insert({
      user_id: userId, key_hash: keyHash, key_prefix: keyPrefix, label: 'cTrader',
    })

    // Store tokens + ingest key — worker will fill in ctid_trader_account_id
    const tokenExpiresAt = new Date(Date.now() + (expiresIn ?? 3600) * 1000).toISOString()

    // Repart d'un état propre : un nouveau token OAuth couvre démo + live, donc on
    // remplace TOUTES les lignes du user (le worker re-résout l'environnement réel).
    await db.from('ctrader_accounts').delete().eq('user_id', userId)
    await db.from('ctrader_accounts').insert({
      user_id:           userId,
      environment:       'live',
      access_token:      accessToken,
      refresh_token:     refreshToken ?? null,
      token_expires_at:  tokenExpiresAt,
      ingest_key:        plain,
    })

    return NextResponse.redirect(`${appUrl}/dashboard?ctrader=connected`)
  } catch (e: any) {
    console.error('[ctrader/callback]', e)
    return NextResponse.redirect(`${errorRedirect}&reason=${encodeURIComponent('exception:' + (e?.message ?? ''))}`)
  }
}
