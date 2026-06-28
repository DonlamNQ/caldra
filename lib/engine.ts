import { createClient } from '@supabase/supabase-js'
import { sendAlertEmail, sendWebhookAlert, sendTelegramAlert } from './brevo'
import { newsConflict } from './economic-calendar'
import { isMaxPlan, MAX_ONLY_DETECTORS, isVip } from './plans'
import { detectorEnabled, detectorThreshold } from './detectors'
import { PROPFIRM_PRESETS, PROPFIRM_PHASES, targetForPhase, type PropFirmPhase } from './propfirms'

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Compte VIP (email) → traité comme plan Max (les 18 détecteurs), sans abonnement.
async function isVipUser(userId: string): Promise<boolean> {
  try {
    const { data } = await getSupabase().auth.admin.getUserById(userId)
    return isVip(data?.user?.email)
  } catch { return false }
}

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

// Durée lisible pour les notifs (s / min / h).
function durFR(sec: number): string {
  const s = Math.round(Number(sec) || 0)
  if (s < 90) return `${s}s`
  const m = Math.round(s / 60)
  return m < 90 ? `${m} min` : `${(m / 60).toFixed(1).replace('.0', '')}h`
}

// Notif = le HOOK humain : ton communicatif + le CHIFFRE/contexte clé tissé
// naturellement (pas un dump technique). Le détail complet reste au dashboard (feed).
function buildPushContent(a: Alert): { title: string; body: string } {
  const d = a.detail as any
  const hhmm = (v: unknown) => String(v ?? '').slice(0, 5)
  switch (a.type) {
    case 'revenge_sizing':
      return { title: '⚠️ Revenge sizing', body: `Tu as ×${d.ratio} ta taille après une perte. Respire avant le prochain.` }
    case 'immediate_reentry':
      return { title: '⚡ Re-entrée rapide', body: `Repositionné ${durFR(d.seconds_since_exit)} après ta sortie. Laisse retomber.` }
    case 'consecutive_losses':
      return { title: '📉 Pertes en série', body: `${d.count} pertes d'affilée. Fais une pause avant de continuer.` }
    case 'drawdown_alert':
      return a.level === 3
        ? { title: '🔴 Drawdown max atteint', body: `Limite de perte du jour atteinte (${d.drawdown_pct}%). Coupe — tu as fait ta part.` }
        : { title: '⚠️ Drawdown', body: `Tu approches ta limite de perte (${d.drawdown_pct}% / ${d.max_allowed}%). Ralentis.` }
    case 'outside_session':
      return { title: '🕐 Hors session', body: `Tu trades à ${hhmm(d.entry_time)}, hors de ta fenêtre (${hhmm(d.session_start)}–${hhmm(d.session_end)}).` }
    case 'overtrading':
      return a.level === 2
        ? { title: '🚫 Limite de trades', body: `${d.current}/${d.max} trades — stop pour aujourd'hui.` }
        : { title: '📊 Overtrading', body: `${d.current}/${d.max} trades. Sois sélectif sur la suite.` }
    case 'stop_not_respected':
      return { title: '🛑 Stop non respecté', body: `Perte à ${d.loss_pct}% (ton risque max : ${d.max_risk_pct}%). Reprends la main.` }
    case 'risk_exceeded':
      return { title: '⚖️ Risk dépassé', body: `Risque ${d.risk_pct}% sur ce trade (max ${d.max_risk_pct}%). Réduis la taille.` }
    case 'news_trading':
      return { title: '📰 Trade pendant news', body: `Tu trades pendant ${d.title} (${d.currency}). Là, c'est le hasard qui décide.` }
    case 'averaging_down':
      return { title: '🔻 Acharnement directionnel', body: `${d.symbol} ${d.direction} : 2 pertes d'affilée sur ce setup, et tu repars. Stop.` }
    case 'euphoria_sizing':
      return { title: '🚀 Sizing d\'euphorie', body: 'Tu grossis ta taille après un gain. La confiance n\'est pas une stratégie.' }
    case 'overleverage':
      return { title: '⚙️ Sur-exposition', body: `Levier ×${d.leverage} sur ce trade (max ${d.max_leverage}×). Un petit mouvement suffit.` }
    case 'no_stop':
      return { title: '🚨 Aucun stop-loss', body: `${d.symbol} fermé sans stop. Risque non borné — protège-toi.` }
    case 'accelerating_frequency':
      return { title: '⏱️ Cadence qui s\'emballe', body: `Tes entrées passent à ${durFR(d.last_gap_sec)} (vs ${durFR(d.median_gap_sec)} d'habitude). C'est le tilt — ralentis.` }
    case 'drawdown_override':
      return { title: '🔴 Limite dépassée', body: `Déjà à ${d.prior_drawdown_pct}% de perte (max ${d.max_allowed}%) et tu continues. Arrête-toi.` }
    case 'cut_winners_hold_losers':
      return { title: '✂️ Tu coupes tes gains', body: `Gagnants tenus ${durFR(d.avg_win_sec)} vs perdants ${durFR(d.avg_loss_sec)}. Inverse la logique.` }
    case 'end_of_day_desperation':
      return { title: '🌙 Fin de session', body: `${d.minutes_to_close} min avant la clôture, en perte. Méfie-toi du rattrapage.` }
    case 'unfamiliar_symbol':
      return { title: '🧭 Actif inhabituel', body: `${d.symbol} n'est pas dans tes instruments habituels — sûr de ton setup ?` }
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
  isMax: boolean,
  rules: Record<string, unknown>
): Promise<Alert[]> {
  // Gating par plan : les 7 détecteurs réservés au plan Max sont retirés pour
  // les plans Pro/Free. Filtrage AVANT suppressRedundant pour qu'une alerte Pro
  // ne soit pas masquée par une alerte Max qui, elle, n'aurait pas dû s'afficher.
  if (!isMax) alerts = alerts.filter(a => !MAX_ONLY_DETECTORS.has(a.type))
  // Détecteurs désactivés par l'utilisateur (config Max) → retirés.
  const detCfg = (rules.detector_config as any) || {}
  alerts = alerts.filter(a => detectorEnabled(detCfg, a.type))
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
    // Telegram = canal Max uniquement (bot token + chat id fournis par l'utilisateur).
    const tgToken: string | null = isMax ? ((rules.telegram_bot_token as string) ?? null) : null
    const tgChat: string | null = isMax ? ((rules.telegram_chat_id as string) ?? null) : null

    // Anti-spam email : 1 seul mail par TYPE d'alerte critique et par session.
    // Si une alerte de ce type a déjà été émise aujourd'hui (level ≥ 3), on ne
    // renvoie pas de mail — on cherche le 1er type critique encore non notifié.
    const criticalAlerts = alerts.filter(a => a.level >= 3)
    let alertToEmail: Alert | null = null
    if (userEmail && criticalAlerts.length > 0) {
      const insertedIds = (insertedAlerts ?? []).map(a => a.id)
      let priorQ = supabase.from('alerts')
        .select('type')
        .eq('user_id', trade.user_id)
        .eq('session_date', today)
        .gte('level', 3)
      if (insertedIds.length) priorQ = priorQ.not('id', 'in', `(${insertedIds.join(',')})`)
      const { data: priorCritical } = await priorQ
      const alreadyEmailed = new Set((priorCritical ?? []).map((r: { type: string }) => r.type))
      alertToEmail = criticalAlerts.find(a => !alreadyEmailed.has(a.type)) ?? null
    }
    await Promise.all([
      alertToEmail
        ? sendAlertEmail({ to: userEmail as string, alertType: alertToEmail.type, level: alertToEmail.level, message: alertToEmail.message, sessionDate: today, detail: alertToEmail.detail })
        : Promise.resolve(),
      ...hotAlerts.map(a => webhookUrl
        ? sendWebhookAlert(webhookUrl, a.type, a.level, a.message, today)
        : Promise.resolve()
      ),
      ...(tgToken && tgChat
        ? hotAlerts.map(a => sendTelegramAlert(tgToken, tgChat, a.type, a.level, a.message, today))
        : []),
    ])
  }

  // Push notification — 1 seule par trade (alerte la plus grave). Si d'autres
  // signaux ont aussi été déclenchés sur le même trade, on le signale en fin de
  // corps pour que l'utilisateur sache qu'il y en a plus à consulter dans l'app.
  const topPush = alerts.reduce((a, b) => b.level > a.level ? b : a)
  const extraCount = alerts.length - 1
  await import('./push').then(({ sendPushToUser }) => {
    const { title, body } = buildPushContent(topPush)
    const suffix = extraCount <= 0 ? ''
      : extraCount === 1 ? ' + 1 autre signal sur ce trade.'
      : ` + ${extraCount} autres signaux sur ce trade.`
    return sendPushToUser(trade.user_id, title, body + suffix, topPush.level)
  }).catch(() => {})

  return alerts
}

// ── Détecteurs comportementaux liés à l'ENTRÉE ───────────────────────────────
// outside_session, revenge_sizing, immediate_reentry, overtrading.
// Extraits pour pouvoir tourner aussi à la fermeture (cTrader ne poste que des
// trades fermés → analyzeOpenTrade n'est jamais appelé pour ces comptes).
// En mode prop firm actif, Caldra est « un cran plus strict » : les détecteurs se
// déclenchent plus tôt (un seul mauvais jour peut griller un challenge).
function isPropStrict(rules: Record<string, any>): boolean {
  return !!((rules.prop_firm_active ?? !!rules.prop_firm) && rules.prop_firm)
}

// Notifications push liées à l'AVANCEMENT du challenge prop firm (Max). Envoyées sur
// le téléphone, hors du feed d'alertes comportementales :
//   • marge TOTALE du challenge entamée (≥ 80 %) — alerte de protection du compte
//   • jalons d'objectif (75 % puis 100 %) — repères motivants vers la validation
// La marge JOURNALIÈRE n'est PAS doublée ici : `drawdown_alert` la couvre déjà (en
// mode prop firm la limite journalière = celle du preset). Déduplication via
// `notif_state` : marge = 1×/jour, jalons = 1×/challenge (clé = date d'activation).
async function maybeChallengeNudges(rules: Record<string, any>, isMax: boolean): Promise<void> {
  if (!isMax || !isPropStrict(rules)) return
  const startedAt = (rules.prop_firm_started_at as string | null) || null
  const preset = PROPFIRM_PRESETS.find(p => p.id === rules.prop_firm)
  if (!startedAt || !preset || !rules.user_id) return

  const supabase = getSupabase()
  const { data: chalTrades } = await supabase.from('trades')
    .select('pnl').eq('user_id', rules.user_id).eq('status', 'closed').gte('entry_time', startedAt)
  const cumPnl = (chalTrades ?? []).reduce((s: number, t: any) => s + (t.pnl || 0), 0)

  const capital = Number(rules.account_size) || 10000
  const phase = (rules.prop_firm_phase as PropFirmPhase) || 'p1'
  const phaseLabel = PROPFIRM_PHASES.find(p => p.id === phase)?.label ?? 'Phase 1'
  const totalLimit = preset.total * capital / 100
  const targetAmt = targetForPhase(preset, phase) * capital / 100
  const totalUsedPct = totalLimit > 0 ? Math.round(Math.max(0, -cumPnl) / totalLimit * 100) : 0
  const objPct = targetAmt > 0 ? Math.round(cumPnl / targetAmt * 100) : 0
  const fmtEur = (v: number) => `€${Math.round(v).toLocaleString('fr-FR')}`
  const today = new Date().toISOString().split('T')[0]

  const { data: stateRows } = await supabase.from('notif_state').select('kind, value').eq('user_id', rules.user_id)
  const seen = new Map<string, string | null>((stateRows ?? []).map((r: any) => [r.kind, r.value]))
  const mark = (kind: string, value: string) =>
    supabase.from('notif_state').upsert(
      { user_id: rules.user_id, kind, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,kind' })

  const { sendPushToUser } = await import('./push')

  // Marge totale entamée (≥ 80 %) → 1 push par jour.
  if (totalUsedPct >= 80 && seen.get('chal-total') !== today) {
    await sendPushToUser(rules.user_id, 'Marge de challenge entamée',
      `Tu as consommé ${Math.min(100, totalUsedPct)} % de ta marge totale. Protège ton compte avant de continuer.`,
      3, '/dashboard', 'chal-total')
    await mark('chal-total', today)
  }

  // Jalons d'objectif (1× par challenge ; repérés par la date d'activation).
  if (targetAmt > 0) {
    if (objPct >= 100 && seen.get('chal-obj-done') !== startedAt) {
      await sendPushToUser(rules.user_id, 'Objectif de phase atteint',
        `Objectif ${phaseLabel} atteint. Sécurise tes gains et lance la validation.`,
        1, '/dashboard', 'chal-obj-done')
      await mark('chal-obj-done', startedAt)
    } else if (objPct >= 75 && objPct < 100 && seen.get('chal-obj-75') !== startedAt) {
      await sendPushToUser(rules.user_id, 'Tu approches de ton objectif',
        `Plus que ${fmtEur(Math.max(0, targetAmt - cumPnl))} pour valider ta ${phaseLabel}. Reste discipliné.`,
        1, '/dashboard', 'chal-obj-75')
      await mark('chal-obj-75', startedAt)
    }
  }
}

function entryBehaviorAlerts(trade: Trade, rules: Record<string, any>, sessionTrades: Trade[]): Alert[] {
  const alerts: Alert[] = []
  const cfg = (rules.detector_config as any) || {}
  const strict = isPropStrict(rules)
  // Sizing : seuil ramené à 1.3× (au lieu de 1.5×) ; sur-activité : alerte dès 60 %
  // (au lieu de 80 %) ; re-entrée : fenêtre élargie ×1.5. Tout ça uniquement en prop firm.
  const tighten = (ratio: number) => strict ? Math.min(ratio, 1.3) : ratio
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
  if (prevTrade && (prevTrade.pnl ?? 0) < 0 && trade.size > prevTrade.size * tighten(detectorThreshold(cfg, 'revenge_sizing', 'ratio', 1.5))) {
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
    if (secsSinceLastExit >= 0 && secsSinceLastExit < rules.min_time_between_entries_sec * (strict ? 1.5 : 1)) {
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
  if (tradeCount >= rules.max_trades_per_session * (strict ? 0.6 : 0.8)) {
    const level = tradeCount >= rules.max_trades_per_session * (strict ? 0.85 : 1) ? 2 : 1
    alerts.push({
      type: 'overtrading',
      level,
      message: level === 2 ? 'Limite de trades atteinte' : 'Tu approches ta limite de trades',
      detail: { current: tradeCount, max: rules.max_trades_per_session },
    })
  }

  // ── 5. ACHARNEMENT DIRECTIONNEL (clé interne: averaging_down) ──────────────
  // Re-rentrer une N-ième fois sur le MÊME instrument, dans le MÊME sens, alors
  // que les DEUX dernières prises sur ce même setup ont perdu = s'entêter sur
  // une idée déjà invalidée deux fois. Reprendre un setup valide une seule fois
  // après un stop est du trading normal → on n'alerte qu'à partir de la 2e perte.
  // On ne regarde QUE les trades sur ce symbole+sens : des trades intercalés sur
  // d'autres instruments ne cassent pas la chaîne. Un GAIN entre-temps sur ce
  // même setup, lui, remet le compteur à zéro (l'idée a fonctionné).
  // La taille n'entre pas en compte (l'entêtement, pas le sur-engagement).
  // NB : trades séquentiels fermés (pas le renforcement d'une position encore
  // ouverte — non détectable depuis les deals fermés cTrader).
  // Distinct du revenge (qui ne regarde ni le symbole ni le sens).
  const sameSetup = prevTrades.filter(
    (t: Trade) => t.symbol === trade.symbol && t.direction === trade.direction
  )
  const needLosses = Math.round(detectorThreshold(cfg, 'averaging_down', 'losses', 2))
  const lastN = sameSetup.slice(0, needLosses)
  if (lastN.length === needLosses && lastN.every((t: Trade) => (t.pnl ?? 0) < 0)) {
    alerts.push({
      type: 'averaging_down',
      level: 3,
      message: `Tu réattaques le même sens après ${needLosses} perte${needLosses > 1 ? 's' : ''} d'affilée`,
      detail: {
        symbol: trade.symbol,
        direction: trade.direction,
        losses: needLosses,
        previous_pnls: lastN.map((t: Trade) => t.pnl ?? 0),
      },
    })
  }

  // ── 6. SIZING D'EUPHORIE ──────────────────────────────────────────────────
  // Taille qui gonfle après un GAIN (excès de confiance) — miroir du revenge.
  if (prevTrade && (prevTrade.pnl ?? 0) > 0 && trade.size > prevTrade.size * tighten(detectorThreshold(cfg, 'euphoria_sizing', 'ratio', 1.5))) {
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
      if (minsToEnd >= 0 && minsToEnd <= detectorThreshold(cfg, 'end_of_day_desperation', 'minutes', 10) && priorPnl < 0) {
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
async function maybeNewsAlert(trade: Trade, windowMin = 10): Promise<Alert | null> {
  const news = await newsConflict(trade.entry_time, trade.symbol, windowMin)
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

  const isMax = isMaxPlan(profile?.plan) || await isVipUser(trade.user_id)
  const alerts = entryBehaviorAlerts(trade, rules, sessionTrades)
  const news = await maybeNewsAlert(trade, detectorThreshold((rules as any).detector_config, 'news_trading', 'window', 10))
  if (news) alerts.push(news)
  const unfamiliar = await maybeUnfamiliarSymbolAlert(trade)
  if (unfamiliar) alerts.push(unfamiliar)

  return saveAndNotify(trade, alerts, sessionTrades, isMax, rules)
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

  const isMax = isMaxPlan(profile?.plan) || await isVipUser(trade.user_id)
  // Mode prop firm : « un cran plus strict » sur les détecteurs de fermeture aussi
  // (1 perte consécutive de moins, alerte drawdown dès 70 % de la limite).
  const strict = isPropStrict(rules)

  // Trade fermé sans ouverture préalablement ingérée (ex. cTrader, qui ne poste
  // que des trades fermés) → on fait aussi tourner les détecteurs d'entrée,
  // sinon overtrading / outside_session / revenge / re-entrée ne se déclenchent jamais.
  if (includeEntryChecks) {
    alerts.push(...entryBehaviorAlerts(trade, rules, sessionTrades))
    const news = await maybeNewsAlert(trade, detectorThreshold((rules as any).detector_config, 'news_trading', 'window', 10))
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
  if (lossStreak >= (strict ? Math.max(2, rules.max_consecutive_losses - 1) : rules.max_consecutive_losses)) {
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

  if (totalPnl < 0 && drawdownPct >= rules.max_daily_drawdown_pct * (strict ? 0.7 : 0.8)) {
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

  // Notifs d'avancement de challenge (marge totale + jalons) — best effort, ne doit
  // jamais faire échouer l'ingestion.
  try { await maybeChallengeNudges(rules as any, isMax) } catch (e) { console.error('challenge nudges', e) }

  return saveAndNotify(trade, alerts, sessionTrades, isMax, rules)
}

// Compat — utilisé par l'ancien /api/detect (legacy)
export async function analyzeTradeForAlerts(trade: Trade): Promise<Alert[]> {
  if (!trade.exit_price || trade.pnl == null) return analyzeOpenTrade(trade)
  return analyzeClosedTrade(trade)
}
