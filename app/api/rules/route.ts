import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await service()
    .from('trading_rules')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json(data ?? { ...DEFAULTS, user_id: user.id })
}

export async function PUT(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

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

  const { data, error } = await service()
    .from('trading_rules')
    .upsert(rules, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    const { account_size, slack_webhook_url, ...baseRules } = rules
    const { data: data2, error: error2 } = await service()
      .from('trading_rules')
      .upsert(baseRules, { onConflict: 'user_id' })
      .select()
      .single()
    if (error2) return NextResponse.json({ error: error2.message }, { status: 500 })
    return NextResponse.json(data2)
  }
  return NextResponse.json(data)
}
