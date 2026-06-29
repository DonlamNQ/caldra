import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

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
  tz_offset_hours: 0,
  max_leverage: 30,
  require_stop_loss: false,
  telegram_bot_token: null as string | null,
  telegram_chat_id: null as string | null,
  detector_config: {} as Record<string, unknown>,
  prop_firm: null as string | null,
  prop_firm_started_at: null as string | null,
  prop_firm_phase_started_at: null as string | null,
  prop_firm_active: false,
  prop_firm_phase: 'p1',
}

async function getUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(_req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await service()
    .from('trading_rules')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json(data ?? { ...DEFAULTS, user_id: user.id })
}

export async function PUT(req: NextRequest) {
  const user = await getUser()
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
    tz_offset_hours: Math.round(Number(body.tz_offset_hours ?? 0)),
    max_leverage: Number(body.max_leverage) || 30,
    require_stop_loss: body.require_stop_loss === true || body.require_stop_loss === 'true',
    telegram_bot_token: body.telegram_bot_token ? String(body.telegram_bot_token).trim() : null,
    telegram_chat_id: body.telegram_chat_id ? String(body.telegram_chat_id).trim() : null,
    detector_config: (body.detector_config && typeof body.detector_config === 'object') ? body.detector_config : {},
    prop_firm: body.prop_firm ? String(body.prop_firm) : null,
    // Horodatage d'activation prop firm : accepte une date (legacy) OU un timestamp ISO complet.
    prop_firm_started_at: (body.prop_firm && body.prop_firm_started_at && !isNaN(Date.parse(String(body.prop_firm_started_at)))) ? String(body.prop_firm_started_at) : null,
    // Début de la PHASE en cours (suivi de challenge) ; repli sur l'évaluation si absent.
    prop_firm_phase_started_at: (body.prop_firm && body.prop_firm_phase_started_at && !isNaN(Date.parse(String(body.prop_firm_phase_started_at)))) ? String(body.prop_firm_phase_started_at) : ((body.prop_firm && body.prop_firm_started_at && !isNaN(Date.parse(String(body.prop_firm_started_at)))) ? String(body.prop_firm_started_at) : null),
    // Vue active : on n'est en vue prop firm que si une firme est configurée ET le flag est vrai.
    prop_firm_active: !!(body.prop_firm && body.prop_firm_active),
    // Phase du challenge : p1 / p2 / funded (défaut p1).
    prop_firm_phase: ['p1', 'p2', 'funded'].includes(String(body.prop_firm_phase)) ? String(body.prop_firm_phase) : 'p1',
  }

  const { data, error } = await service()
    .from('trading_rules')
    .upsert(rules, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    // Retry without optional columns that may not exist yet in older DB schemas
    const { account_size, slack_webhook_url, tz_offset_hours, max_leverage, require_stop_loss, telegram_bot_token, telegram_chat_id, detector_config, prop_firm, prop_firm_started_at, prop_firm_phase_started_at, prop_firm_active, prop_firm_phase, ...baseRules } = rules
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
