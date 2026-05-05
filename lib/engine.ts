import { createClient } from '@supabase/supabase-js'
import { sendAlertEmail, sendWebhookAlert } from './brevo'
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

  // sessionTrades inclut le trade courant (inséré avant l'analyse).
  // On l'exclut pour les comparaisons "trade précédent".
  const prevTrades = sessionTrades.filter((t: Trade) => t.id !== trade.id)
  const prevTrade = prevTrades[0] ?? null  // trade précédent le plus récent

  // ── 1. REVENGE SIZING ─────────────────────────────────────────────────────
  if (prevTrade && (prevTrade.pnl ?? 0) < 0 && trade.size > prevTrade.size * 1.5) {
    alerts.push({
      type: 'revenge_sizing',
      level: 2,
      message: 'Revenge sizing détecté',
      detail: {
        previous_size: prevTrade.size,
        current_size: trade.size,
        ratio: (trade.size / prevTrade.size).toFixed(2),
      },
    })
  }

  // ── 2. RE-ENTRÉE IMMÉDIATE ────────────────────────────────────────────────
  if (prevTrade?.exit_time) {
    const secsSinceLastExit =
      (new Date(trade.entry_time).getTime() -
        new Date(prevTrade.exit_time).getTime()) / 1000

    if (secsSinceLastExit >= 0 && secsSinceLastExit < rules.min_time_between_entries_sec) {
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
  // On inclut le trade courant dans le décompte des pertes consécutives
  const allToday = sessionTrades // inclut le trade courant
  const lastN = allToday.slice(0, rules.max_consecutive_losses)
  const consecutiveLossCount = lastN.filter((t: Trade) => (t.pnl ?? 0) < 0).length

  if (consecutiveLossCount >= rules.max_consecutive_losses) {
    alerts.push({
      type: 'consecutive_losses',
      level: 2,
      message: `${rules.max_consecutive_losses} pertes consécutives`,
      detail: { count: consecutiveLossCount },
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
  // Utilise UTC pour être cohérent avec le format ISO des trades entrants
  const entryHour = new Date(trade.entry_time).toISOString().slice(11, 16)
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
  const tradeCount = sessionTrades.length  // inclut le trade courant
  if (tradeCount >= rules.max_trades_per_session * 0.8) {
    const level = tradeCount >= rules.max_trades_per_session ? 2 : 1
    alerts.push({
      type: 'overtrading',
      level,
      message: level === 2
        ? 'Limite de trades atteinte'
        : 'Tu approches ta limite de trades',
      detail: {
        current: tradeCount,
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

    await Promise.all(hotAlerts.map(a => Promise.all([
      userEmail
        ? sendAlertEmail({ to: userEmail, alertType: a.type, level: a.level, message: a.message, sessionDate: today, detail: a.detail })
        : Promise.resolve(),
      webhookUrl
        ? sendWebhookAlert(webhookUrl, a.type, a.level, a.message, today)
        : Promise.resolve(),
    ])))

    // Push notifications — import dynamique non-bloquant (ne doit jamais casser l'ingest)
    void import('./push').then(({ sendPushToUser }) => {
      const label = a => a.level === 3 ? '🔴 Critique' : '🟠 Attention'
      return Promise.all(hotAlerts.map(a => sendPushToUser(trade.user_id, `${label(a)} — Caldra`, a.message, a.level)))
    }).catch(() => {})
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
