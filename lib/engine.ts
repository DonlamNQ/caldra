import { createClient } from '@supabase/supabase-js'
import { sendAlertEmail, sendWebhookAlert } from './brevo'
import { newsConflict } from './economic-calendar'

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  stop_loss?: number
  status?: string
}

export type Alert = {
  type: string
  level: 1 | 2 | 3
  message: string
  detail: Record<string, unknown>
}

// Notif = le HOOK humain (communicatif, zéro chiffre). Les chiffres vivent dans le
// dashboard (feed → détail technique). Titre = emoji + nom court ; corps = nudge.
function buildPushContent(a: Alert): { title: string; body: string } {
  switch (a.type) {
    case 'revenge_sizing':
      return { title: '⚠️ Revenge sizing', body: 'Tu grossis ta taille après une perte. Respire avant le prochain.' }
    case 'immediate_reentry':
      return { title: '⚡ Re-entrée rapide', body: 'À peine sorti, déjà rentré. Laisse retomber la pression.' }
    case 'consecutive_losses':
      return { title: '📉 Pertes en série', body: 'Plusieurs pertes d\'affilée. Fais une pause avant de continuer.' }
    case 'drawdown_alert':
      return a.level === 3
        ? { title: '🔴 Drawdown max atteint', body: 'Tu as atteint ta limite du jour. Coupe — tu as fait ta part.' }
        : { title: '⚠️ Drawdown', body: 'Tu approches ta limite de perte du jour. Ralentis.' }
    case 'outside_session':
      return { title: '🕐 Hors session', body: 'Tu trades hors de ta fenêtre. Suis ton plan, pas l\'impulsion.' }
    case 'overtrading':
      return a.level === 2
        ? { title: '🚫 Limite de trades', body: 'Tu as atteint ta limite du jour. Stop pour aujourd\'hui.' }
        : { title: '📊 Overtrading', body: 'Tu approches ta limite de trades. Sois sélectif.' }
    case 'stop_not_respected':
      return { title: '🛑 Stop non respecté', body: 'Tu as laissé filer au-delà de ton risque. Reprends la main.' }
    case 'risk_exceeded':
      return { title: '⚖️ Risk dépassé', body: 'Position trop grosse pour ton risque. Réduis la taille.' }
    case 'news_trading':
      return { title: '📰 Trade pendant news', body: 'Tu trades en pleine annonce — là, c\'est le hasard qui décide.' }
    case 'averaging_down':
      return { title: '🔻 Acharnement directionnel', body: 'Tu réattaques une idée qui vient d\'échouer. Stop.' }
    case 'euphoria_sizing':
      return { title: '🚀 Sizing d\'euphorie', body: 'Tu grossis après un gain. La confiance n\'est pas une stratégie.' }
    case 'overleverage':
      return { title: '⚙️ Sur-exposition', body: 'Levier trop élevé sur ce trade. Un petit mouvement suffit à faire mal.' }
    case 'no_stop':
      return { title: '🚨 Aucun stop-loss', body: 'Trade sans stop = risque non borné. Protège-toi.' }
    case 'accelerating_frequency':
      return { title: '⏱️ Cadence qui s\'emballe', body: 'Tes entrées s\'accélèrent en perdant. C\'est le tilt — ralentis.' }
    case 'drawdown_override':
      return { title: '🔴 Limite dépassée', body: 'Tu continues après avoir dépassé ta limite. Arrête-toi maintenant.' }
    case 'cut_winners_hold_losers':
      return { title: '✂️ Tu coupes tes gains', body: 'Tu coupes tes gains et gardes tes pertes. Inverse la logique.' }
    case 'end_of_day_desperation':
      return { title: '🌙 Fin de session', body: 'Trade de dernière minute en perte. Méfie-toi du rattrapage.' }
    case 'unfamiliar_symbol':
      return { title: '🧭 Actif inhabituel', body: 'Tu sors de tes instruments habituels — sûr de ton setup ?' }
    default:
      return { title: a.message, body: '' }
  }
}

// Quand une alerte « sur-ensemble » plus sévère est présente sur le même trade,
// on masque la version plus faible qui dit la même chose — évite la cascade de
// doublons en fin de mauvaise session (clé = alerte faible, valeurs = alertes qui
// la rendent redondante si elles sont aussi déclenchées).
const REDUNDANT_WHEN: Record<string, string[]> = {
  revenge_sizing: ['averaging_down'],     // averaging_down = grossir après perte, même symbole/sens (plus précis, L3)
  drawdown_alert: ['drawdown_override'],  // override = a déjà franchi le max ET continue (L3)
}

function suppressRedundant(alerts: Alert[]): Alert[] {
  const present = new Set(alerts.map(a => a.type))
  return alerts.filter(a => {
    const supersets = REDUNDANT_WHEN[a.type]
    return !supersets || !supersets.some(s => present.has(s))
  })
}

async function saveAndNotify(
  trade: Trade,
  alerts: Alert[],
  sessionTrades: Trade[],
  isSentinel: boolean,
  rules: Record<string, unknown>
): Promise<Alert[]> {
  alerts = suppressRedundant(alerts)
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

  // Le coaching IA n'est plus généré ici (redondant + jamais affiché) : les cartes
  // de coaching sont produites côté client via /api/sentinel (Haiku), et le débrief
  // de session via /api/debrief. Voir SentinelPanel.

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
      message: 'Taille augmentée après une perte',
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
        message: 'Repositionné trop vite après la sortie',
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

  // ── 5. ACHARNEMENT DIRECTIONNEL (clé interne: averaging_down) ──────────────
  // Re-rentrer sur le MÊME instrument, dans le MÊME sens, avec une taille ≥,
  // juste après que ce trade s'est CLÔTURÉ en perte = s'acharner sur l'idée qui
  // vient d'échouer. NB : trades séquentiels fermés (pas le renforcement d'une
  // position encore ouverte — non détectable depuis les deals fermés cTrader).
  // Distinct du revenge (qui ne regarde ni le symbole ni le sens).
  if (
    prevTrade &&
    (prevTrade.pnl ?? 0) < 0 &&
    prevTrade.symbol === trade.symbol &&
    prevTrade.direction === trade.direction &&
    trade.size >= prevTrade.size
  ) {
    alerts.push({
      type: 'averaging_down',
      level: 3,
      message: 'Tu réattaques le même sens juste après une perte',
      detail: {
        symbol: trade.symbol,
        direction: trade.direction,
        previous_size: prevTrade.size,
        current_size: trade.size,
        previous_pnl: prevTrade.pnl ?? 0,
      },
    })
  }

  // ── 6. SIZING D'EUPHORIE ──────────────────────────────────────────────────
  // Taille qui gonfle après un GAIN (excès de confiance) — miroir du revenge.
  if (prevTrade && (prevTrade.pnl ?? 0) > 0 && trade.size > prevTrade.size * 1.5) {
    alerts.push({
      type: 'euphoria_sizing',
      level: 2,
      message: 'Taille augmentée après un gain',
      detail: {
        previous_size: prevTrade.size,
        current_size: trade.size,
        ratio: (trade.size / prevTrade.size).toFixed(2),
      },
    })
  }

  // ── 7. ACCÉLÉRATION DE LA FRÉQUENCE ───────────────────────────────────────
  // L'écart entre entrées s'effondre alors que la session est perdante (tilt).
  {
    const entries = sessionTrades
      .map((t: Trade) => new Date(t.entry_time).getTime())
      .sort((a: number, b: number) => a - b)
    if (entries.length >= 4) {
      const gaps: number[] = []
      for (let i = 1; i < entries.length; i++) gaps.push(entries[i] - entries[i - 1])
      const lastGap = gaps[gaps.length - 1]
      const earlier = gaps.slice(0, -1).sort((a, b) => a - b)
      const median = earlier[Math.floor(earlier.length / 2)]
      const sessionPnl = sessionTrades.reduce((s: number, t: Trade) => s + (t.pnl || 0), 0)
      if (median > 0 && lastGap < median * 0.4 && sessionPnl < 0) {
        alerts.push({
          type: 'accelerating_frequency',
          level: 2,
          message: 'Tu trades de plus en plus vite en perdant',
          detail: {
            last_gap_sec: Math.round(lastGap / 1000),
            median_gap_sec: Math.round(median / 1000),
            trades: entries.length,
          },
        })
      }
    }
  }

  // ── 8. DÉSESPOIR DE FIN DE SESSION ────────────────────────────────────────
  // Entrée dans les 10 dernières min avant la clôture, session déjà perdante.
  {
    const [endH, endM] = String(rules.session_end || '').split(':').map(Number)
    if (!isNaN(endH)) {
      const minsToEnd = (endH * 60 + (endM || 0)) - localMins
      const priorPnl = prevTrades.reduce((s: number, t: Trade) => s + (t.pnl || 0), 0)
      if (minsToEnd >= 0 && minsToEnd <= 10 && priorPnl < 0) {
        alerts.push({
          type: 'end_of_day_desperation',
          level: 2,
          message: 'Trade de fin de session en territoire perdant',
          detail: {
            minutes_to_close: minsToEnd,
            session_end: rules.session_end,
            session_pnl: priorPnl,
          },
        })
      }
    }
  }

  return alerts
}

// Détecteur "Trade pendant news" — croise l'heure d'entrée avec le calendrier
// économique (événements à fort impact ±10 min sur la devise du symbole).
async function maybeNewsAlert(trade: Trade): Promise<Alert | null> {
  const news = await newsConflict(trade.entry_time, trade.symbol)
  if (!news) return null
  return {
    type: 'news_trading',
    level: 2,
    message: `Trade à ${news.minutes} min d'une news ${news.currency} à fort impact`,
    detail: { title: news.title, currency: news.currency, minutes_from_event: news.minutes },
  }
}

// Détecteur "Actif inhabituel" — le trader ouvre une position sur un symbole qu'il
// ne trade PAS d'habitude (FOMO, chasse aux opportunités, hors zone de compétence).
// Compare au-delà de la session du jour : sur une fenêtre glissante d'historique.
// Garde-fou nouveau user : sous un minimum d'historique, tout paraîtrait "inhabituel"
// → on se tait tant que le profil n'est pas assez fourni.
async function maybeUnfamiliarSymbolAlert(trade: Trade): Promise<Alert | null> {
  const LOOKBACK_DAYS = 15
  const MIN_HISTORY_TRADES = 8   // sous ce seuil : pas assez de profil → pas d'alerte
  const norm = (s: unknown) => String(s ?? '').trim().toUpperCase()
  const sym = norm(trade.symbol)
  if (!sym) return null

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()
  const { data: hist } = await getSupabase()
    .from('trades')
    .select('symbol')
    .eq('user_id', trade.user_id)
    .gte('entry_time', since)
    .neq('id', trade.id)   // exclut le trade courant (déjà inséré au moment de l'analyse)

  if (!hist || hist.length < MIN_HISTORY_TRADES) return null

  const known = new Set(hist.map(t => norm(t.symbol)))
  if (known.has(sym)) return null

  return {
    type: 'unfamiliar_symbol',
    level: 1,
    message: 'Hors de tes instruments habituels',
    detail: { symbol: trade.symbol, known_symbols: known.size, lookback_days: LOOKBACK_DAYS },
  }
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
  const news = await maybeNewsAlert(trade)
  if (news) alerts.push(news)
  const unfamiliar = await maybeUnfamiliarSymbolAlert(trade)
  if (unfamiliar) alerts.push(unfamiliar)

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
    const news = await maybeNewsAlert(trade)
    if (news) alerts.push(news)
    const unfamiliar = await maybeUnfamiliarSymbolAlert(trade)
    if (unfamiliar) alerts.push(unfamiliar)
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
      message: 'Série de pertes en cours',
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
      message: level === 3 ? 'STOP — limite de perte journalière atteinte' : 'Tu approches ta limite de perte du jour',
      detail: {
        current_pnl: totalPnl,
        drawdown_pct: drawdownPct.toFixed(2),
        max_allowed: rules.max_daily_drawdown_pct,
        account_size: accountSize,
      },
    })
  }

  // ── 3. STOP NON RESPECTÉ ──────────────────────────────────────────────────
  // Perte réalisée sur CE trade au-delà du risque par trade autorisé → le stop
  // n'a pas été tenu (ou était absent). Mesurable sans capturer le stop-loss.
  const tradeLoss = trade.pnl ?? 0
  if (tradeLoss < 0) {
    const lossPct = Math.abs(tradeLoss / accountSize) * 100
    if (lossPct > rules.max_risk_per_trade_pct) {
      alerts.push({
        type: 'stop_not_respected',
        level: 2,
        message: 'Perte au-delà de ton risque par trade',
        detail: {
          loss: tradeLoss,
          loss_pct: lossPct.toFixed(2),
          max_risk_pct: rules.max_risk_per_trade_pct,
          account_size: accountSize,
        },
      })
    }
  }

  // ── 4. RISK DÉPASSÉ — risque planifié (entrée → stop) au-delà du budget ────
  // Valeur monétaire par unité de prix dérivée du trade lui-même (auto-calibré,
  // indépendant de l'instrument) : |pnl| / |sortie − entrée|.
  const sl    = Number(trade.stop_loss)
  const entry = Number(trade.entry_price)
  const exit  = Number(trade.exit_price)
  if (sl > 0 && entry > 0 && exit > 0 && exit !== entry) {
    const valuePerUnit = Math.abs((trade.pnl ?? 0) / (exit - entry))
    const riskAmount   = Math.abs(entry - sl) * valuePerUnit
    const riskPct      = (riskAmount / accountSize) * 100
    if (riskPct > rules.max_risk_per_trade_pct) {
      alerts.push({
        type: 'risk_exceeded',
        level: 2,
        message: 'Position trop grande pour ton risque par trade',
        detail: {
          risk_pct: riskPct.toFixed(2),
          max_risk_pct: rules.max_risk_per_trade_pct,
          stop_loss: sl,
          entry_price: entry,
          account_size: accountSize,
        },
      })
    }
  }

  // ── 5. SUR-EXPOSITION (overleverage) ──────────────────────────────────────
  // Valeur notionnelle de la position vs capital. valuePerUnit (= taille ×
  // multiplicateur) auto-calibré depuis le trade → notional = valuePerUnit×prix.
  {
    const entryP = Number(trade.entry_price)
    const exitP  = Number(trade.exit_price)
    if (entryP > 0 && exitP > 0 && exitP !== entryP) {
      const valuePerUnit = Math.abs((trade.pnl ?? 0) / (exitP - entryP))
      const notional = valuePerUnit * entryP
      const leverage = notional / accountSize
      const maxLev = Number(rules.max_leverage) || 30
      if (leverage > maxLev) {
        alerts.push({
          type: 'overleverage',
          level: leverage > maxLev * 1.5 ? 3 : 2,
          message: 'Effet de levier trop élevé sur ce trade',
          detail: {
            leverage: leverage.toFixed(1),
            max_leverage: maxLev,
            notional: Math.round(notional),
            account_size: accountSize,
          },
        })
      }
    }
  }

  // ── 6. AUCUN STOP (no_stop) — opt-in via rules.require_stop_loss ───────────
  // Trade fermé sans stop-loss défini → risque non borné. Désactivé par défaut
  // (sinon bruyant pour les flux qui ne transmettent jamais le stop).
  if (rules.require_stop_loss && !(Number(trade.stop_loss) > 0)) {
    alerts.push({
      type: 'no_stop',
      level: 2,
      message: 'Trade fermé sans stop-loss',
      detail: { symbol: trade.symbol, pnl: trade.pnl ?? null },
    })
  }

  // ── 7. DISPOSITION EFFECT (coupe les gains, garde les pertes) ─────────────
  // Durée moyenne des gagnants << celle des perdants sur la session.
  {
    const dur = (t: Trade): number | null =>
      t.exit_time && t.entry_time
        ? (new Date(t.exit_time).getTime() - new Date(t.entry_time).getTime()) / 1000
        : null
    const wins   = (sessionTrades as Trade[]).filter(t => (t.pnl ?? 0) > 0 && dur(t) != null)
    const losses = (sessionTrades as Trade[]).filter(t => (t.pnl ?? 0) < 0 && dur(t) != null)
    if (wins.length >= 2 && losses.length >= 2) {
      const avg = (arr: Trade[]) => arr.reduce((s, t) => s + (dur(t) as number), 0) / arr.length
      const avgWin = avg(wins), avgLoss = avg(losses)
      if (avgLoss > 0 && avgWin < avgLoss * 0.5) {
        alerts.push({
          type: 'cut_winners_hold_losers',
          level: 2,
          message: 'Tu coupes tes gains et laisses courir tes pertes',
          detail: {
            avg_win_sec: Math.round(avgWin),
            avg_loss_sec: Math.round(avgLoss),
            wins: wins.length,
            losses: losses.length,
          },
        })
      }
    }
  }

  // ── 8. TILT POST-DRAWDOWN (drawdown_override) ─────────────────────────────
  // L'utilisateur avait DÉJÀ franchi son drawdown max avant ce trade, et a
  // quand même continué à trader.
  {
    const priorTrades = (sessionTrades as Trade[]).filter(
      t => t.id !== trade.id &&
        new Date(t.entry_time).getTime() < new Date(trade.entry_time).getTime()
    )
    const priorPnl = priorTrades.reduce((s, t) => s + (t.pnl || 0), 0)
    const priorDdPct = Math.abs(priorPnl / accountSize) * 100
    if (priorPnl < 0 && priorDdPct >= rules.max_daily_drawdown_pct) {
      alerts.push({
        type: 'drawdown_override',
        level: 3,
        message: 'Tu continues à trader après avoir dépassé ta limite',
        detail: {
          prior_pnl: priorPnl,
          prior_drawdown_pct: priorDdPct.toFixed(2),
          max_allowed: rules.max_daily_drawdown_pct,
        },
      })
    }
  }

  return saveAndNotify(trade, alerts, sessionTrades, isSentinel, rules)
}

// Compat — utilisé par l'ancien /api/detect (legacy)
export async function analyzeTradeForAlerts(trade: Trade): Promise<Alert[]> {
  if (!trade.exit_price || trade.pnl == null) return analyzeOpenTrade(trade)
  return analyzeClosedTrade(trade)
}
