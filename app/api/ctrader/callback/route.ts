import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ctraderClient } from '@/lib/ctrader'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  let userId  = searchParams.get('state')
  const error = searchParams.get('error')

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcaldra.com'

  if (error) {
    console.error(`[cTrader][callback] OAuth error: ${error}`)
    return NextResponse.redirect(`${base}/dashboard?tab=integrations?ctrader=error`)
  }

  // Fallback : si state manquant, récupère l'user depuis la session
  if (!userId) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {}
  }

  if (!code || !userId) {
    return NextResponse.redirect(`${base}/dashboard?tab=integrations?ctrader=missing_params`)
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  try {
    const tokens   = await ctraderClient.exchangeCode(code)
    const accounts = await ctraderClient.getAccounts(tokens.accessToken)

    if (accounts.length === 0) {
      return NextResponse.redirect(`${base}/dashboard?tab=integrations?ctrader=no_account`)
    }

    const account   = accounts[0]
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString()

    // Préserve caldra_api_key si déjà configurée
    const { data: existing } = await service
      .from('ctrader_connections')
      .select('caldra_api_key')
      .eq('user_id', userId)
      .eq('account_id', account.accountId)
      .single()

    const { error: upsertErr } = await service
      .from('ctrader_connections')
      .upsert({
        user_id:        userId,
        account_id:     account.accountId,
        account_name:   account.accountName,
        access_token:   tokens.accessToken,
        refresh_token:  tokens.refreshToken,
        expires_at:     expiresAt,
        caldra_api_key: existing?.caldra_api_key ?? '',
        is_active:      true,
      }, { onConflict: 'user_id,account_id' })

    if (upsertErr) {
      console.error(`[cTrader][callback] DB upsert error:`, upsertErr)
      return NextResponse.redirect(`${base}/dashboard?tab=integrations?ctrader=db_error`)
    }

    console.log(`[cTrader][callback] user=${userId} connecté — account=${account.accountId} (${account.accountName})`)
  } catch (err) {
    console.error(`[cTrader][callback] Erreur:`, err instanceof Error ? err.message : err)
    return NextResponse.redirect(`${base}/dashboard?tab=integrations?ctrader=error`)
  }

  return NextResponse.redirect(`${base}/dashboard?tab=integrations?ctrader=connected`)
}
