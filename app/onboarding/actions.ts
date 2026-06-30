'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function saveRulesAction(rules: Record<string, unknown>): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const row = {
    user_id: user.id,
    max_daily_drawdown_pct:       Number(rules.max_daily_drawdown_pct),
    max_consecutive_losses:       Math.round(Number(rules.max_consecutive_losses)),
    min_time_between_entries_sec: Math.round(Number(rules.min_time_between_entries_sec)),
    session_start:                String(rules.session_start),
    session_end:                  String(rules.session_end),
    max_trades_per_session:       Math.round(Number(rules.max_trades_per_session)),
    max_risk_per_trade_pct:       Number(rules.max_risk_per_trade_pct),
    account_size:                 Number(rules.account_size) || 10000,
    slack_webhook_url:            rules.slack_webhook_url ? String(rules.slack_webhook_url) : null,
    timezone:                     (typeof rules.timezone === 'string' && (rules.timezone as string).includes('/')) ? rules.timezone : 'Europe/Paris',
  }

  let { error } = await service
    .from('trading_rules')
    .upsert(row, { onConflict: 'user_id' })

  if (error) {
    // Repli si la colonne `timezone` n'existe pas encore (migration v2.23 non appliquée).
    const { timezone, ...base } = row
    ;({ error } = await service.from('trading_rules').upsert(base, { onConflict: 'user_id' }))
  }

  if (error) return { error: error.message }
  return { ok: true }
}
