import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ctraderClient } from '@/lib/ctrader'
import { ctraderManager } from '@/lib/ctrader-manager'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: conn } = await service
    .from('ctrader_connections')
    .select('account_id, account_name, is_active, caldra_api_key, access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .single()

  let polling = ctraderManager.isPolling(user.id)

  // Lazy-restart : si connexion active avec clé API mais polling stoppé (redémarrage serveur)
  if (conn?.is_active && conn.caldra_api_key?.startsWith('cal_') && !polling) {
    try {
      const ingestBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcaldra.com'
      const intervalId = ctraderClient.streamDeals(
        conn.access_token,
        conn.refresh_token,
        conn.account_id,
        user.id,
        conn.caldra_api_key,
        ingestBase,
      )
      ctraderManager.start(user.id, conn.account_id, intervalId)
      polling = true
      console.log(`[cTrader][status] Polling relancé après redémarrage — user=${user.id} account=${conn.account_id}`)
    } catch (err) {
      console.error(`[cTrader][status] Échec lazy-restart polling:`, err)
    }
  }

  return NextResponse.json({
    connected:       !!(conn?.is_active),
    polling,
    accountId:       conn?.account_id ?? null,
    accountName:     conn?.account_name ?? null,
    needsActivation: conn && !conn.is_active,
    hasApiKey:       !!(conn?.caldra_api_key && conn.caldra_api_key.startsWith('cal_')),
  })
}
