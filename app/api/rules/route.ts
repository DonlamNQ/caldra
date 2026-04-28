import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const DEFAULTS = {
  max_daily_drawdown_pct: 3,
  max_consecutive_losses: 3,
  min_time_between_entries_sec: 120,
  session_start: '09:30',
  session_end: '16:00',
  max_trades_per_session: 10,
  max_risk_per_trade_pct: 1,
  account_size: 10000,
  slack_webhook_url: null as string | null,
}

async function getUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(s) { try { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
  return supabase.auth.getUser()
}

export async function GET() {
  const { data: { user } } = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await service
    .from('trading_rules')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json(data ?? { ...DEFAULTS, user_id: user.id })
}

export async function PUT(req: NextRequest) {
  const { data: { user } } = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Validation basique
  const rules = {
    user_id: user.id,
    max_daily_drawdown_pct: Number(body.max_daily_drawdown_pct),
    max_consecutive_losses: Math.round(Number(body.max_consecutive_losses)),
    min_time_between_entries_sec: Math.round(Number(body.min_time_between_entries_sec)),
    session_start: String(body.session_start),
    session_end: String(body.session_end),
    max_trades_per_session: Math.round(Number(body.max_trades_per_session)),
    max_risk_per_trade_pct: Number(body.max_risk_per_trade_pct),
    account_size: Number(body.account_size) || 10000,
    slack_webhook_url: body.slack_webhook_url ? String(body.slack_webhook_url) : null,
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await service
    .from('trading_rules')
    .upsert(rules, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
