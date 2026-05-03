import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import DashboardClient from './DashboardClient'
import type { AlertRow } from '@/components/dashboard/AlertFeed'
import type { TradeRow } from '@/components/dashboard/TradeLog'

export interface DaySession {
  date: string
  score: number
  pnl: number
  tradeCount: number
  wins: number
  alertCount: number
  criticalAlerts: number
  alerts: Array<{ level: number; type: string; message: string }>
}

function computeScore(alerts: { level?: number; severity?: number }[]): number {
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
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { data: todayAlerts },
    { data: todayTrades },
    { data: histTrades },
    { data: histAlerts },
    { data: rules },
    { data: apiKey },
    { data: yesterdayAlerts },
    { data: yesterdayTrades },
    { data: profile },
  ] = await Promise.all([
    service.from('alerts').select('*').eq('user_id', user.id).eq('session_date', today)
      .order('level', { ascending: false }).order('created_at', { ascending: false }),
    service.from('trades').select('*').eq('user_id', user.id).gte('entry_time', today)
      .order('entry_time', { ascending: false }).limit(50),
    service.from('trades').select('id,symbol,direction,size,entry_price,exit_price,pnl,entry_time,exit_time')
      .eq('user_id', user.id).gte('entry_time', thirtyDaysAgo).lt('entry_time', today)
      .order('entry_time'),
    service.from('alerts').select('session_date,level,type,message')
      .eq('user_id', user.id).gte('session_date', thirtyDaysAgo).lt('session_date', today),
    service.from('trading_rules').select('*').eq('user_id', user.id).single(),
    service.from('api_keys').select('key_prefix,created_at').eq('user_id', user.id).limit(1).single(),
    service.from('alerts').select('level').eq('user_id', user.id).eq('session_date', yesterday),
    service.from('trades').select('pnl').eq('user_id', user.id)
      .gte('entry_time', yesterday).lt('entry_time', today),
    service.from('user_profiles').select('plan').eq('user_id', user.id).single(),
  ])

  // Today
  const safeAlerts: AlertRow[] = todayAlerts ?? []
  const safeTrades: TradeRow[] = todayTrades ?? []
  const totalPnl = safeTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const wins = safeTrades.filter(t => (t.pnl ?? 0) > 0).length
  const losses = safeTrades.filter(t => (t.pnl ?? 0) < 0).length

  // Yesterday
  const yesterdayPnl = (yesterdayTrades ?? []).reduce((s, t) => s + (t.pnl ?? 0), 0)
  const yesterdayScore = computeScore(yesterdayAlerts ?? [])
  const yesterdayData = (yesterdayTrades?.length ?? 0) > 0 || (yesterdayAlerts?.length ?? 0) > 0
    ? { score: yesterdayScore, pnl: yesterdayPnl, alerts: yesterdayAlerts?.length ?? 0 }
    : null

  // Historical sessions for calendar
  const tradesByDate: Record<string, typeof histTrades> = {}
  for (const t of histTrades ?? []) {
    const date = t.entry_time.split('T')[0]
    if (!tradesByDate[date]) tradesByDate[date] = []
    tradesByDate[date]!.push(t)
  }

  const alertsByDate: Record<string, typeof histAlerts> = {}
  for (const a of histAlerts ?? []) {
    if (!a.session_date) continue
    if (!alertsByDate[a.session_date]) alertsByDate[a.session_date] = []
    alertsByDate[a.session_date]!.push(a)
  }

  const allDates = new Set([...Object.keys(tradesByDate), ...Object.keys(alertsByDate)])
  const historicalSessions: DaySession[] = Array.from(allDates)
    .sort()
    .map(date => {
      const dayTrades = tradesByDate[date] ?? []
      const dayAlerts = alertsByDate[date] ?? []
      const pnl = dayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
      const w = dayTrades.filter(t => (t.pnl ?? 0) > 0).length
      return {
        date,
        score: computeScore(dayAlerts),
        pnl,
        tradeCount: dayTrades.length,
        wins: w,
        alertCount: dayAlerts.length,
        criticalAlerts: dayAlerts.filter(a => a.level === 3).length,
        alerts: dayAlerts.map(a => ({ level: a.level ?? 1, type: a.type ?? '', message: a.message ?? '' })),
      }
    })

  const meta = user.user_metadata ?? {}

  return (
    <DashboardClient
      userId={user.id}
      userEmail={user.email ?? ''}
      initialScore={computeScore(safeAlerts)}
      initialAlerts={safeAlerts}
      initialTrades={safeTrades}
      initialStats={{ total_trades: safeTrades.length, total_pnl: totalPnl, wins, losses }}
      yesterdayStats={yesterdayData}
      tradingRules={rules ?? null}
      apiKeyPrefix={apiKey?.key_prefix ?? null}
      historicalSessions={historicalSessions}
      plan={profile?.plan ?? 'free'}
      userMeta={{ first_name: meta.first_name, last_name: meta.last_name, phone: meta.phone }}
    />
  )
}
