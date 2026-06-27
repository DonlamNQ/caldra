import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function computeScore(alerts: any[]): number {
  const deductions = alerts.reduce((sum, a) => {
    const level = a.level ?? a.severity ?? 1
    if (level === 3) return sum + 18
    if (level === 2) return sum + 8
    return sum + 3
  }, 0)
  return Math.max(0, 100 - deductions)
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies()

  // Vérifier la session
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Mode prop firm : la Session live est scopée à l'HEURE EXACTE d'activation
  // (prop_firm_started_at = timestamptz) → on exclut les trades faits avant.
  const { data: rules } = await service.from('trading_rules').select('prop_firm, prop_firm_started_at, prop_firm_active').eq('user_id', user.id).single()
  const propActiveSaved = (rules as any)?.prop_firm_active ?? !!(rules as any)?.prop_firm
  const propStartTs = (propActiveSaved && (rules as any)?.prop_firm && (rules as any)?.prop_firm_started_at)
    ? String((rules as any).prop_firm_started_at) : null
  const liveFloor = propStartTs && new Date(propStartTs).getTime() > new Date(today).getTime()
    ? propStartTs : today
  const scopedLive = liveFloor !== today

  let alertsQuery = service
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .eq('session_date', today)
    .order('level', { ascending: false })
    .order('created_at', { ascending: false })
  if (scopedLive) alertsQuery = alertsQuery.gte('created_at', liveFloor)

  const [{ data: alerts }, { data: trades }] = await Promise.all([
    alertsQuery,

    service
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_time', liveFloor)
      .order('entry_time', { ascending: false })
      .limit(20),
  ])

  const safeAlerts = alerts ?? []
  const safeTrades = trades ?? []
  const totalPnl = safeTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)

  return NextResponse.json({
    score: computeScore(safeAlerts),
    alerts: safeAlerts,
    trades: safeTrades,
    stats: {
      total_trades: safeTrades.length,
      total_pnl: totalPnl,
      wins: safeTrades.filter((t: any) => (t.pnl ?? 0) > 0).length,
      losses: safeTrades.filter((t: any) => (t.pnl ?? 0) < 0).length,
    },
  })
}
