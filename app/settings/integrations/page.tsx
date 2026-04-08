import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import CTraderClient from './CTraderClient'

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: { ctrader?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/settings/integrations')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: conn } = await service
    .from('ctrader_connections')
    .select('account_id, account_name, is_active, caldra_api_key')
    .eq('user_id', user.id)
    .single()

  const status = {
    connected:       !!(conn?.is_active),
    polling:         false, // will be updated client-side via /api/ctrader/status
    accountId:       conn?.account_id ?? null,
    accountName:     conn?.account_name ?? null,
    needsActivation: !!(conn && !conn.is_active),
    hasApiKey:       !!(conn?.caldra_api_key?.startsWith('cal_')),
  }

  return (
    <CTraderClient
      userEmail={user.email ?? ''}
      status={status}
      searchParams={searchParams}
    />
  )
}
