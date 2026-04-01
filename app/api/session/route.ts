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
