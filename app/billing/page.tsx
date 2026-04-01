import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import BillingClient from './BillingClient'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/billing')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ data: profile }, { count: tradeCount }, { count: alertCount }] = await Promise.all([
    service
      .from('user_profiles')
      .select('plan, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .single(),

    service
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('entry_time', startOfMonth),

    service
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth),
  ])

  return (
    <BillingClient
      userEmail={user.email ?? ''}
      plan={(profile?.plan as 'free' | 'pro' | 'team') ?? 'free'}
      tradeCount={tradeCount ?? 0}
      alertCount={alertCount ?? 0}
    />
  )
}
