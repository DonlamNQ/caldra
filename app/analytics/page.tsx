import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/analytics')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: trades }, { data: alerts }] = await Promise.all([
    service
      .from('trades')
      .select('id, pnl, entry_time, direction, symbol')
      .eq('user_id', user.id)
      .gte('entry_time', since)
      .not('pnl', 'is', null)
      .order('entry_time', { ascending: true }),

    service
      .from('alerts')
      .select('id, type, pattern, level, severity, created_at')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
  ])

  return (
    <AnalyticsClient
      trades={trades ?? []}
      alerts={alerts ?? []}
      userEmail={user.email ?? ''}
    />
  )
}
