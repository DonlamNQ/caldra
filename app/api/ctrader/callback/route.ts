import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ctraderClient } from '@/lib/ctrader'
import { ctraderManager } from '@/lib/ctrader-manager'

export async function GET(req: NextRequest) {
  console.log('[cTrader callback] URL reçue:', req.url)
  const { searchParams } = new URL(req.url)
  console.log('[cTrader callback] params:', Object.fromEntries(searchParams))

  const code  = searchParams.get('code')
  let userId  = searchParams.get('state')
  const error = searchParams.get('error')

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcaldra.com'

  if (error) {
    console.error(`[cTrader][callback] OAuth error: ${error}`)
    return NextResponse.redirect(`${base}/settings/integrations?ctrader=error`)
  }

  // Fallback : si state manquant, récupère l'user depuis la session SSR
  if (!userId) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        console.log(`[cTrader][callback] state manquant — userId résolu via session: ${userId}`)
      }
    } catch (sessionErr) {
      console.error(`[cTrader][callback] Impossible de résoudre l'user via session:`, sessionErr)
    }
  }

  if (!code || !userId) {
    console.error(`[cTrader][callback] Params manquants — code=${code} userId=${userId}`)
    return NextResponse.redirect(`${base}/settings/integrations?ctrader=missing_params`)
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  try {
    // 1. Échange du code contre des tokens
    const tokens = await ctraderClient.exchangeCode(code)

    // 2. Récupère les comptes cTrader
    const accounts = await ctraderClient.getAccounts(tokens.accessToken)
    if (accounts.length === 0) {
      console.error(`[cTrader][callback] Aucun compte pour user=${userId}`)
      return NextResponse.redirect(`${base}/settings/integrations?ctrader=no_account`)
    }

    const account   = accounts[0]
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString()

    // 3. Vérifie si une connexion existe déjà (pour préserver caldra_api_key)
    const { data: existing } = await service
      .from('ctrader_connections')
      .select('caldra_api_key')
      .eq('user_id', userId)
      .eq('account_id', account.accountId)
      .single()

    const caldraApiKey = existing?.caldra_api_key ?? ''

    // 4. Upsert tokens + is_active:true — préserve caldra_api_key si déjà configurée
    const { error: upsertErr } = await service
      .from('ctrader_connections')
      .upsert({
        user_id:        userId,
        account_id:     account.accountId,
        account_name:   account.accountName,
        access_token:   tokens.accessToken,
        refresh_token:  tokens.refreshToken,
        expires_at:     expiresAt,
        caldra_api_key: caldraApiKey,
        is_active:      true,
      }, { onConflict: 'user_id,account_id' })

    if (upsertErr) {
      console.error(`[cTrader][callback] DB upsert error:`, upsertErr)
      return NextResponse.redirect(`${base}/settings/integrations?ctrader=db_error`)
    }

    console.log(`[cTrader][callback] user=${userId} tokens stockés — account=${account.accountId} (${account.accountName}) is_active=true`)

    // 5. Démarre le polling immédiatement si caldra_api_key disponible
    if (caldraApiKey?.startsWith('cal_') && !ctraderManager.isPolling(userId)) {
      const ingestBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcaldra.com'
      const intervalId = ctraderClient.streamDeals(
        tokens.accessToken,
        tokens.refreshToken,
        account.accountId,
        userId,
        caldraApiKey,
        ingestBase,
      )
      ctraderManager.start(userId, account.accountId, intervalId)
      console.log(`[cTrader][callback] Polling démarré — user=${userId} account=${account.accountId}`)
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[cTrader][callback] Erreur:`, msg)
    return NextResponse.redirect(`${base}/settings/integrations?ctrader=error`)
  }

  return NextResponse.redirect(`${base}/settings/integrations?ctrader=connected`)
}
