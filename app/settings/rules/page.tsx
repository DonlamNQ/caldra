import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import RulesForm from './RulesForm'

const DEFAULTS = {
  max_daily_drawdown_pct: 3,
  max_consecutive_losses: 3,
  min_time_between_entries_sec: 120,
  session_start: '09:30',
  session_end: '16:00',
  max_trades_per_session: 10,
  max_risk_per_trade_pct: 1,
}

export default async function SettingsRulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/settings/rules')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: rules } = await service
    .from('trading_rules')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <RulesForm
      initial={rules ?? DEFAULTS}
      userEmail={user.email ?? ''}
    />
  )
}
