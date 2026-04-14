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
    .select('account_id, account_name, is_active')
    .eq('user_id', user.id)
    .single()

  const initialStatus = {
    connected:   !!(conn?.is_active),
    polling:     false,
    accountId:   conn?.account_id ?? null,
    accountName: conn?.account_name ?? null,
  }

  return (
    <CTraderClient
      userEmail={user.email ?? ''}
      initialStatus={initialStatus}
      searchParams={searchParams}
    />
  )
}
