import { createClient } from '@supabase/supabase-js'
import { sendAlertEmail, sendWebhookAlert } from './brevo'
import { sendPushToUser } from './push'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type Trade = {
  id: string
  user_id: string
  symbol: string
  direction: 'long' | 'short'
  size: number
  entry_price: number
  exit_price?: number
  entry_time: string
  exit_time?: string
  pnl?: number
}

export type Alert = {
  type: string
  level: 1 | 2 | 3
  message: string
  detail: Record<string, unknown>
}

async function generateCoachingForAlert(
  alertId: string,
  alertType: string,
  alertMessage: string,
  alertDetail: Record<string, unknown>,
  recentTrades: Trade[]
): Promise<void> {
  try {
    const tradeContext = recentTrades.slice(0, 5)
      .map(t => `${t.symbol} ${t.direction} size=${t.size} pnl=${t.pnl ?? '?'}`)
      .join(', ')

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Tu es le coach Caldra. Alerte déclenchée : "${alertMessage}" (${alertType}). Données : ${JSON.stringify(alertDetail)}. Trades récents : ${tradeContext}. Génère exactement 2 phrases : 1) le comportement observé sans jugement, 2) une action concrète à faire maintenant. Ton direct et bienveillant, pas de "vous".`,
      }],
    })

    const coaching = (msg.content[0] as { type: string; text: string }).text

    await supabase
      .from('alerts')
      .update({ detail: { ...alertDetail, coaching } })
      .eq('id', alertId)
  } catch {
    // Coaching is non-critical — silently skip if Anthropic is unavailable
  }
}

export async function analyzeTradeForAlerts(trade: Trade): Promise<Alert[]> {
  const alerts: Alert[] = []
  const today = new Date().toISOString().split('T')[0]

  // Fetch rules, plan and session trades in parallel
  const [{ data: rules }, { data: profile }, { data: sessionTrades }] = await Promise.all([
    supabase.from('trading_rules').select('*').eq('user_id', trade.user_id).single(),
    supabase.from('user_profiles').select('plan').eq('user_id', trade.user_id).single(),
    supabase.from('trades').select('*').eq('user_id', trade.user_id).gte('entry_time', today).order('entry_time', { ascending: false }),
  ])

  if (!rules || !sessionTrades) return []

  const isSentinel = profile?.plan === 'sentinel'

  // ── 1. REVENGE SIZING ─────────────────────────────────────────────────────
  const lastTrade = sessionTrades[0]
  if (lastTrade && lastTrade.pnl < 0 && trade.size > lastTrade.size * 1.5) {
    alerts.push({
      type: 'revenge_sizing',
      level: 2,
      message: 'Revenge sizing détecté',
      detail: {
        previous_size: lastTrade.size,
        current_size: trade.size,
        ratio: (trade.size / lastTrade.size).toFixed(2),
      },
    })
  }

  // ── 2. RE-ENTRÉE IMMÉDIATE ────────────────────────────────────────────────
  if (lastTrade?.exit_time) {
    const secsSinceLastExit =
      (new Date(trade.entry_time).getTime() -
        new Date(lastTrade.exit_time).getTime()) / 1000

    if (secsSinceLastExit < rules.min_time_between_entries_sec) {
      alerts.push({
        type: 'immediate_reentry',
        level: 1,
        message: 'Re-entrée immédiate détectée',
        detail: {
          seconds_since_exit: Math.round(secsSinceLastExit),
          minimum_required: rules.min_time_between_entries_sec,
        },
      })
    }
  }

  // ── 3. PERTES CONSÉCUTIVES ────────────────────────────────────────────────
  const recentLosses = sessionTrades
    .slice(0, rules.max_consecutive_losses)
    .filter((t: Trade) => (t.pnl ?? 0) < 0)

  if (recentLosses.length >= rules.max_consecutive_losses) {
    alerts.push({
      type: 'consecutive_losses',
      level: 2,
      message: `${rules.max_consecutive_losses} pertes consécutives`,
      detail: { count: recentLosses.length },
    })
  }

  // ── 4. DRAWDOWN JOURNALIER ────────────────────────────────────────────────
  const totalPnl = sessionTrades.reduce((sum: number, t: Trade) => sum + (t.pnl || 0), 0)
  const accountSize = Number(rules.account_size) || 10000
  const drawdownPct = Math.abs(totalPnl / accountSize) * 100

  if (totalPnl < 0 && drawdownPct >= rules.max_daily_drawdown_pct * 0.8) {
    const level = drawdownPct >= rules.max_daily_drawdown_pct ? 3 : 2
    alerts.push({
      type: 'drawdown_alert',
      level,
      message: level === 3
        ? 'STOP — Drawdown maximum atteint'
        : 'Drawdown journalier critique',
      detail: {
        current_pnl: totalPnl,
        drawdown_pct: drawdownPct.toFixed(2),
        max_allowed: rules.max_daily_drawdown_pct,
        account_size: accountSize,
      },
    })
  }

  // ── 5. HORS HORAIRES ──────────────────────────────────────────────────────
  const entryHour = new Date(trade.entry_time).toTimeString().slice(0, 5)
  if (entryHour < rules.session_start || entryHour > rules.session_end) {
    alerts.push({
      type: 'outside_session',
      level: 1,
      message: 'Trade hors de ta fenêtre de session',
      detail: {
        entry_time: entryHour,
        session_start: rules.session_start,
        session_end: rules.session_end,
      },
    })
  }

  // ── 6. SURACTIVITÉ ────────────────────────────────────────────────────────
  if (sessionTrades.length >= rules.max_trades_per_session * 0.8) {
    const level = sessionTrades.length >= rules.max_trades_per_session ? 2 : 1
    alerts.push({
      type: 'overtrading',
      level,
      message: level === 2
        ? 'Limite de trades atteinte'
        : 'Tu approches ta limite de trades',
      detail: {
        current: sessionTrades.length,
        max: rules.max_trades_per_session,
      },
    })
  }

  if (alerts.length === 0) return []

  // ── Sauvegarde les alertes en base ────────────────────────────────────────
  const { data: insertedAlerts } = await supabase.from('alerts').insert(
    alerts.map(a => ({
      user_id: trade.user_id,
      trade_id: trade.id,
      type: a.type,
      level: a.level,
      message: a.message,
      detail: a.detail,
      session_date: today,
    }))
  ).select('id, type, level, message, detail')

  // ── Notifications sortantes (L2/L3 uniquement) ────────────────────────────
  const hotAlerts = alerts.filter(a => a.level >= 2)
  if (hotAlerts.length > 0) {
    const { data: authData } = await supabase.auth.admin.getUserById(trade.user_id)
    const userEmail = authData?.user?.email ?? null
    const webhookUrl: string | null = rules.slack_webhook_url ?? null

    const levelLabel = (l: number) => l === 3 ? '🔴 Critique' : '🟠 Attention'

    await Promise.all(hotAlerts.map(a => Promise.all([
      userEmail
        ? sendAlertEmail({ to: userEmail, alertType: a.type, level: a.level, message: a.message, sessionDate: today, detail: a.detail })
        : Promise.resolve(),
      webhookUrl
        ? sendWebhookAlert(webhookUrl, a.type, a.level, a.message, today)
        : Promise.resolve(),
      sendPushToUser(trade.user_id, `${levelLabel(a.level)} — Caldra`, a.message, a.level),
    ])))
  }

  // ── IA coaching Sentinel (L2/L3 uniquement, non-bloquant) ─────────────────
  if (isSentinel && insertedAlerts) {
    const toCoach = insertedAlerts.filter((a: { level: number }) => a.level >= 2)
    void Promise.all(
      toCoach.map((a: { id: string; type: string; level: number; message: string; detail: Record<string, unknown> }) =>
        generateCoachingForAlert(a.id, a.type, a.message, a.detail ?? {}, sessionTrades)
      )
    )
  }

  return alerts
}
