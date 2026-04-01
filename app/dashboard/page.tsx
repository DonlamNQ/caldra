import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import DashboardClient from './DashboardClient'
import { AlertRow } from '@/components/dashboard/AlertFeed'
import { TradeRow } from '@/components/dashboard/TradeLog'

function computeScore(alerts: AlertRow[]): number {
  const deductions = alerts.reduce((sum, a) => {
    const level = a.level ?? a.severity ?? 1
    if (level === 3) return sum + 18
    if (level === 2) return sum + 8
    return sum + 3
  }, 0)
  return Math.max(0, 100 - deductions)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: alerts }, { data: trades }] = await Promise.all([
    service
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_date', today)
      .order('level', { ascending: false })
      .order('created_at', { ascending: false }),

    service
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_time', today)
      .order('entry_time', { ascending: false })
      .limit(20),
  ])

  const safeAlerts: AlertRow[] = alerts ?? []
  const safeTrades: TradeRow[] = trades ?? []
  const totalPnl = safeTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)

  return (
    <DashboardClient
      userId={user.id}
      userEmail={user.email ?? ''}
      initialScore={computeScore(safeAlerts)}
      initialAlerts={safeAlerts}
      initialTrades={safeTrades}
      initialStats={{
        total_trades: safeTrades.length,
        total_pnl: totalPnl,
        wins: safeTrades.filter(t => (t.pnl ?? 0) > 0).length,
        losses: safeTrades.filter(t => (t.pnl ?? 0) < 0).length,
      }}
    />
  )
}
