import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import MobileClient from './MobileClient'
import type { AlertRow } from '@/components/dashboard/AlertFeed'

function computeScore(alerts: { level?: number }[]): number {
  const deductions = alerts.reduce((sum, a) => {
    const l = a.level ?? 1
    if (l === 3) return sum + 18
    if (l === 2) return sum + 8
    return sum + 3
  }, 0)
  return Math.max(0, 100 - deductions)
}

export default async function MobilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: alerts }, { data: trades }] = await Promise.all([
    service.from('alerts').select('*').eq('user_id', user.id).eq('session_date', today)
      .order('created_at', { ascending: false }).limit(20),
    service.from('trades').select('pnl').eq('user_id', user.id).gte('entry_time', today),
  ])

  const safeAlerts: AlertRow[] = alerts ?? []
  const totalPnl = (trades ?? []).reduce((s, t) => s + (t.pnl ?? 0), 0)
  const tradeCount = trades?.length ?? 0

  return (
    <MobileClient
      userId={user.id}
      userEmail={user.email ?? ''}
      initialScore={computeScore(safeAlerts)}
      initialAlerts={safeAlerts}
      totalPnl={totalPnl}
      tradeCount={tradeCount}
    />
  )
}
