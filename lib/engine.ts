import { createClient } from '@supabase/supabase-js'
import { sendAlertEmail, sendWebhookAlert } from './brevo'
import Anthropic from '@anthropic-ai/sdk'

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
  status?: string
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

    const msg = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Tu es le coach Caldra. Alerte déclenchée : "${alertMessage}" (${alertType}). Données : ${JSON.stringify(alertDetail)}. Trades récents : ${tradeContext}. Génère exactement 2 phrases : 1) le comportement observé sans jugement, 2) une action concrète à faire maintenant. Ton direct et bienveillant, pas de "vous".`,
      }],
    })

    const coaching = (msg.content[0] as { type: string; text: string }).text

    await getSupabase()
      .from('alerts')
      .update({ detail: { ...alertDetail, coaching } })
      .eq('id', alertId)
  } catch {
    // Coaching is non-critical — silently skip if Anthropic is unavailable
  }
}

function buildPushContent(a: Alert): { title: string; body: string } {
  const d = a.detail
  switch (a.type) {
    case 'revenge_sizing':
      return {
        title: '⚠️ Revenge sizing',
        body: `Sizing ×${d.ratio} après une perte — ${d.current_size} lots vs ${d.previous_size}`,
      }
    case 'immediate_reentry':
      return {
        title: '⚡ Re-entrée rapide',
        body: `${d.seconds_since_exit}s après la clôture. Délai minimum : ${d.minimum_required}s.`,
      }
    case 'consecutive_losses':
      return {
        title: `📉 ${d.count} pertes d'affilée`,
        body: 'Pause ou analyse avant de continuer.',
      }
    case 'drawdown_alert':
      return a.level === 3
        ? { title: '🔴 Drawdown max atteint', body: `STOP. PnL session : ${Math.round(Number(d.current_pnl))}€ (−${d.drawdown_pct}%)` }
        : { title: `⚠️ Drawdown à ${d.drawdown_pct}% du seuil`, body: `Ralentis — limite journalière : ${d.max_allowed}%` }
    case 'outside_session':
      return {
        title: '🕐 Hors session',
        body: `Trade à ${String(d.entry_time).slice(0, 5)}. Fenêtre : ${String(d.session_start).slice(0, 5)}–${String(d.session_end).slice(0, 5)}.`,
      }
    case 'overtrading':
      return a.level === 2
        ? { title: '🚫 Limite de trades atteinte', body: `${d.current}/${d.max} trades — stop pour aujourd'hui.` }
        : { title: `📊 ${d.current}/${d.max} trades`, body: "Tu approches ta limite de session." }
    default:
      return { title: a.message, body: '' }
  }
}

async function saveAndNotify(
  trade: Trade,
  alerts: Alert[],
  sessionTrades: Trade[],
  isSentinel: boolean,
  rules: Record<string, unknown>
): Promise<Alert[]> {
  if (alerts.length === 0) return []

  const today = new Date().toISOString().split('T')[0]
  const supabase = getSupabase()

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

  // Notifications sortantes
  const hotAlerts = alerts.filter(a => a.level >= 2)
  if (hotAlerts.length > 0) {
    const { data: authData } = await supabase.auth.admin.getUserById(trade.user_id)
    const userEmail = authData?.user?.email ?? null
    const webhookUrl: string | null = (rules.slack_webhook_url as string) ?? null

    const criticalAlerts = alerts.filter(a => a.level >= 3)
    await Promise.all([
      userEmail && criticalAlerts.length > 0
        ? sendAlertEmail({ to: userEmail, alertType: criticalAlerts[0].type, level: criticalAlerts[0].level, message: criticalAlerts[0].message, sessionDate: today, detail: criticalAlerts[0].detail })
        : Promise.resolve(),
      ...hotAlerts.map(a => webhookUrl
        ? sendWebhookAlert(webhookUrl, a.type, a.level, a.message, today)
        : Promise.resolve()
      ),
    ])
  }

  // Push notification — 1 seule par trade (alerte la plus grave)
  const topPush = alerts.reduce((a, b) => b.level > a.level ? b : a)
  await import('./push').then(({ sendPushToUser }) => {
    const { title, body } = buildPushContent(topPush)
    return sendPushToUser(trade.user_id, title, body, topPush.level)
  }).catch(() => {})

  // IA coaching Sentinel (L2/L3 uniquement, non-bloquant)
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

// ── Détecteurs comportementaux liés à l'ENTRÉE ───────────────────────────────
// outside_session, revenge_sizing, immediate_reentry, overtrading.
// Extraits pour pouvoir tourner aussi à la fermeture (cTrader ne poste que des
// trades fermés → analyzeOpenTrade n'est jamais appelé pour ces comptes).
function entryBehaviorAlerts(trade: Trade, rules: Record<string, any>, sessionTrades: Trade[]): Alert[] {
  const alerts: Alert[] = []
  const prevTrades = sessionTrades.filter((t: Trade) => t.id !== trade.id)
  const prevTrade = prevTrades[0] ?? null

  // ── 1. HORS HORAIRES ──────────────────────────────────────────────────────
  const utcMins = new Date(trade.entry_time).getUTCHours() * 60 + new Date(trade.entry_time).getUTCMinutes()
  const tzOffset = Number(rules.tz_offset_hours ?? 0)
  const localMins = ((utcMins + tzOffset * 60) % 1440 + 1440) % 1440
  const entryHour = `${String(Math.floor(localMins / 60)).padStart(2, '0')}:${String(localMins % 60).padStart(2, '0')}`
  if (entryHour < rules.session_start || entryHour > rules.session_end) {
    alerts.push({
      type: 'outside_session',
      level: 1,
      message: 'Trade hors de ta fenêtre de session',
      detail: { entry_time: entryHour, session_start: rules.session_start, session_end: rules.session_end },
    })
  }

  // ── 2. REVENGE SIZING ─────────────────────────────────────────────────────
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

  // ── 3. RE-ENTRÉE IMMÉDIATE ────────────────────────────────────────────────
  if (prevTrade?.exit_time) {
    const secsSinceLastExit =
      (new Date(trade.entry_time).getTime() - new Date(prevTrade.exit_time).getTime()) / 1000
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

  // ── 4. SURACTIVITÉ ────────────────────────────────────────────────────────
  const tradeCount = sessionTrades.length
  if (tradeCount >= rules.max_trades_per_session * 0.8) {
    const level = tradeCount >= rules.max_trades_per_session ? 2 : 1
    alerts.push({
      type: 'overtrading',
      level,
      message: level === 2 ? 'Limite de trades atteinte' : 'Tu approches ta limite de trades',
      detail: { current: tradeCount, max: rules.max_trades_per_session },
    })
  }

  return alerts
}

// ── Alertes à l'OUVERTURE d'un trade ─────────────────────────────────────────
export async function analyzeOpenTrade(trade: Trade): Promise<Alert[]> {
  const today = new Date().toISOString().split('T')[0]
  const supabase = getSupabase()

  const [{ data: rules }, { data: profile }, { data: sessionTrades }] = await Promise.all([
    supabase.from('trading_rules').select('*').eq('user_id', trade.user_id).single(),
    supabase.from('user_profiles').select('plan').eq('user_id', trade.user_id).single(),
    supabase.from('trades').select('*').eq('user_id', trade.user_id).gte('entry_time', today).order('entry_time', { ascending: false }),
  ])

  if (!rules || !sessionTrades) return []

  const isSentinel = profile?.plan === 'sentinel'
  const alerts = entryBehaviorAlerts(trade, rules, sessionTrades)

  return saveAndNotify(trade, alerts, sessionTrades, isSentinel, rules)
}

// ── Alertes à la FERMETURE d'un trade ────────────────────────────────────────
// consecutive_losses, drawdown_alert
export async function analyzeClosedTrade(trade: Trade, includeEntryChecks = false): Promise<Alert[]> {
  const alerts: Alert[] = []
  const today = new Date().toISOString().split('T')[0]
  const supabase = getSupabase()

  const [{ data: rules }, { data: profile }, { data: sessionTrades }] = await Promise.all([
    supabase.from('trading_rules').select('*').eq('user_id', trade.user_id).single(),
    supabase.from('user_profiles').select('plan').eq('user_id', trade.user_id).single(),
    supabase.from('trades').select('*').eq('user_id', trade.user_id).eq('status', 'closed').gte('entry_time', today).order('entry_time', { ascending: false }),
  ])

  if (!rules || !sessionTrades) return []

  const isSentinel = profile?.plan === 'sentinel'

  // Trade fermé sans ouverture préalablement ingérée (ex. cTrader, qui ne poste
  // que des trades fermés) → on fait aussi tourner les détecteurs d'entrée,
  // sinon overtrading / outside_session / revenge / re-entrée ne se déclenchent jamais.
  if (includeEntryChecks) {
    alerts.push(...entryBehaviorAlerts(trade, rules, sessionTrades))
  }

  // ── 1. PERTES CONSÉCUTIVES ────────────────────────────────────────────────
  // Vraie série en cours : on compte depuis le trade le plus récent jusqu'au
  // premier gain (sessionTrades est trié par entry_time décroissant).
  let lossStreak = 0
  for (const t of sessionTrades as Trade[]) {
    if ((t.pnl ?? 0) < 0) lossStreak++
    else break
  }
  if (lossStreak >= rules.max_consecutive_losses) {
    alerts.push({
      type: 'consecutive_losses',
      level: 2,
      message: `${lossStreak} pertes consécutives`,
      detail: { count: lossStreak, threshold: rules.max_consecutive_losses },
    })
  }

  // ── 2. DRAWDOWN JOURNALIER ────────────────────────────────────────────────
  const totalPnl = sessionTrades.reduce((sum: number, t: Trade) => sum + (t.pnl || 0), 0)
  const accountSize = Number(rules.account_size) || 10000
  const drawdownPct = Math.abs(totalPnl / accountSize) * 100

  if (totalPnl < 0 && drawdownPct >= rules.max_daily_drawdown_pct * 0.8) {
    const level = drawdownPct >= rules.max_daily_drawdown_pct ? 3 : 2
    alerts.push({
      type: 'drawdown_alert',
      level,
      message: level === 3 ? 'STOP — Drawdown maximum atteint' : 'Drawdown journalier critique',
      detail: {
        current_pnl: totalPnl,
        drawdown_pct: drawdownPct.toFixed(2),
        max_allowed: rules.max_daily_drawdown_pct,
        account_size: accountSize,
      },
    })
  }

  return saveAndNotify(trade, alerts, sessionTrades, isSentinel, rules)
}

// Compat — utilisé par l'ancien /api/detect (legacy)
export async function analyzeTradeForAlerts(trade: Trade): Promise<Alert[]> {
  if (!trade.exit_price || trade.pnl == null) return analyzeOpenTrade(trade)
  return analyzeClosedTrade(trade)
}
