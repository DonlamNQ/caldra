// Constructeur partagé des données de rapport (hebdo + mensuel). Centralise tout le
// calcul lourd (métriques de journal, répartitions, synthèse rédigée, recommandations)
// pour que la route à la demande et le cron mensuel produisent EXACTEMENT le même
// document, sans dupliquer la logique.

import { alertLabel } from './alertLabels'
import { PROPFIRM_PRESETS, PROPFIRM_PHASES, targetForPhase, type PropFirmPhase } from './propfirms'
import type {
  WeeklyReportData, DayData, AlertTypeData, TradeItem,
  PerfMetrics, SideStat, SymbolStat, PropFirmInfo, Comparison,
} from './pdf/WeeklyReport'

export type TradeLike = {
  id?: string
  symbol: string
  direction: string
  size: number
  pnl: number | null
  entry_time: string
  exit_time?: string | null
  created_at?: string
}
export type AlertLike = {
  type: string
  level?: number
  session_date: string
  trade_id?: string | null
  created_at?: string
}
export type Bucket = { label: string; startStr: string; endStr: string }

function computeScore(alerts: { level?: number }[]): number {
  const deductions = alerts.reduce((sum, a) => {
    const level = a.level ?? 1
    return sum + (level === 3 ? 18 : level === 2 ? 8 : 3)
  }, 0)
  return Math.max(0, 100 - deductions)
}

// Score moyen sur les jours TRADÉS d'un lot de trades+alertes (pour la tendance).
function avgScoreOf(trades: TradeLike[], alerts: AlertLike[]): number | null {
  const tradedDays = new Set(trades.map(t => t.entry_time.slice(0, 10)))
  if (tradedDays.size === 0) return null
  const byDay = new Map<string, AlertLike[]>()
  for (const a of alerts) {
    if (!tradedDays.has(a.session_date)) continue
    const arr = byDay.get(a.session_date)
    if (arr) arr.push(a); else byDay.set(a.session_date, [a])
  }
  let sum = 0
  for (const d of tradedDays) sum += computeScore(byDay.get(d) ?? [])
  return Math.round(sum / tradedDays.size)
}

function computeMetrics(trades: TradeLike[]): PerfMetrics {
  const closed = trades.filter(t => t.pnl != null)
  const pnls = closed.map(t => t.pnl as number)
  const winsPnl = pnls.filter(p => p > 0)
  const lossPnl = pnls.filter(p => p < 0)
  const grossProfit = winsPnl.reduce((s, p) => s + p, 0)
  const grossLoss = lossPnl.reduce((s, p) => s + p, 0)   // négatif
  const avgWin = winsPnl.length ? grossProfit / winsPnl.length : 0
  const avgLoss = lossPnl.length ? grossLoss / lossPnl.length : 0
  const total = pnls.reduce((s, p) => s + p, 0)

  // Profit factor : null = ∞ (gains sans aucune perte).
  let profitFactor: number | null
  if (Math.abs(grossLoss) < 0.0001) profitFactor = grossProfit > 0 ? null : 0
  else profitFactor = grossProfit / Math.abs(grossLoss)

  // Séries gagnantes / perdantes max (trades dans l'ordre chronologique).
  const ordered = [...closed].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())
  let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0
  for (const t of ordered) {
    const p = t.pnl as number
    if (p > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin) }
    else if (p < 0) { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss) }
    else { curWin = 0; curLoss = 0 }
  }

  // Durée moyenne (trades fermés avec exit_time).
  const durs = closed
    .filter(t => t.exit_time)
    .map(t => (new Date(t.exit_time as string).getTime() - new Date(t.entry_time).getTime()) / 60000)
    .filter(d => d >= 0)
  const avgDurationMin = durs.length ? durs.reduce((s, d) => s + d, 0) / durs.length : null

  return {
    profitFactor,
    expectancy: pnls.length ? total / pnls.length : 0,
    avgWin, avgLoss,
    payoff: avgLoss !== 0 ? avgWin / Math.abs(avgLoss) : null,
    bestTrade: pnls.length ? Math.max(...pnls) : 0,
    worstTrade: pnls.length ? Math.min(...pnls) : 0,
    maxWinStreak: maxWin, maxLossStreak: maxLoss,
    avgDurationMin, grossProfit, grossLoss,
  }
}

function computeSides(trades: TradeLike[]): { long: SideStat; short: SideStat } {
  const mk = (dir: string): SideStat => {
    const ts = trades.filter(t => (t.direction || '').toLowerCase() === dir && t.pnl != null)
    return { trades: ts.length, wins: ts.filter(t => (t.pnl as number) > 0).length, pnl: ts.reduce((s, t) => s + (t.pnl as number), 0) }
  }
  return { long: mk('long'), short: mk('short') }
}

function computeSymbols(trades: TradeLike[]): SymbolStat[] {
  const map = new Map<string, SymbolStat>()
  for (const t of trades) {
    if (t.pnl == null) continue
    const sym = (t.symbol || '—').toUpperCase()
    const cur = map.get(sym) ?? { symbol: sym, trades: 0, wins: 0, pnl: 0 }
    cur.trades++; cur.pnl += t.pnl as number; if ((t.pnl as number) > 0) cur.wins++
    map.set(sym, cur)
  }
  // Tri par nombre de trades puis par magnitude de PnL ; top 8.
  return Array.from(map.values())
    .sort((a, b) => b.trades - a.trades || Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 8)
}

const fmtE = (v: number) => `${v >= 0 ? '+' : '-'}€${Math.abs(Math.round(v)).toLocaleString('fr-FR')}`

function buildNarrative(opts: {
  periodWord: string; totalTrades: number; totalPnl: number; winRate: number
  avgScore: number; trendDelta: number | null; topAlert: AlertTypeData | null
  criticalAlerts: number; bestSym: SymbolStat | null
}): string {
  const { periodWord, totalTrades, totalPnl, winRate, avgScore, trendDelta, topAlert, criticalAlerts, bestSym } = opts
  if (totalTrades === 0) return `Aucun trade sur ${periodWord}. Rien à analyser cette fois — reviens avec ta routine en place.`

  const parts: string[] = []
  parts.push(`Sur ${periodWord}, tu as pris ${totalTrades} trade${totalTrades > 1 ? 's' : ''} pour un résultat net de ${fmtE(totalPnl)} (${winRate}% de réussite).`)

  let disc = `Ta discipline moyenne s'établit à ${avgScore}/100`
  if (trendDelta != null && trendDelta !== 0) disc += `, ${trendDelta > 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(trendDelta)} point${Math.abs(trendDelta) > 1 ? 's' : ''} par rapport à la période précédente`
  else if (trendDelta === 0) disc += `, stable par rapport à la période précédente`
  parts.push(disc + '.')

  if (topAlert) {
    parts.push(`Ton signal le plus fréquent a été « ${topAlert.label} » (${topAlert.count}×)${criticalAlerts > 0 ? `, avec ${criticalAlerts} alerte${criticalAlerts > 1 ? 's' : ''} critique${criticalAlerts > 1 ? 's' : ''}` : ''}.`)
  } else {
    parts.push(`Aucun signal comportemental déclenché : une période propre, c'est exactement le but.`)
  }

  if (bestSym && bestSym.pnl !== 0) {
    parts.push(`Côté performance, ${bestSym.symbol} ressort le plus nettement (${fmtE(bestSym.pnl)} sur ${bestSym.trades} trade${bestSym.trades > 1 ? 's' : ''}).`)
  }

  parts.push(avgScore >= 70
    ? `Globalement, ton cadre a tenu. Garde la même rigueur la prochaine fois.`
    : avgScore >= 40
    ? `Le cadre s'est effrité par moments. Reprends tes règles de base pour la suite.`
    : `La période a été difficile côté discipline. Reviens à l'essentiel : taille fixe, stop, et pause après deux pertes.`)

  return parts.join(' ')
}

function buildRecommendations(opts: {
  metrics: PerfMetrics; sides: { long: SideStat; short: SideStat }; symbols: SymbolStat[]
  topAlert: AlertTypeData | null; trendDelta: number | null; winRate: number
}): string[] {
  const { metrics: m, sides, symbols, topAlert, trendDelta, winRate } = opts
  const recos: string[] = []

  if (topAlert) recos.push(`Travaille en priorité sur « ${topAlert.label} » : c'est ton signal le plus récurrent sur la période.`)

  // Côté nettement perdant vs l'autre.
  const { long, short } = sides
  if (long.pnl < 0 && short.pnl > 0 && long.trades >= 3) recos.push(`Tes positions longues t'ont coûté (${fmtE(long.pnl)} sur ${long.trades} trades) alors que tes shorts gagnent. Recentre-toi sur ce qui marche.`)
  else if (short.pnl < 0 && long.pnl > 0 && short.trades >= 3) recos.push(`Tes positions courtes t'ont coûté (${fmtE(short.pnl)} sur ${short.trades} trades) alors que tes longs gagnent. Recentre-toi sur ce qui marche.`)

  // Pire symbole.
  const worstSym = [...symbols].sort((a, b) => a.pnl - b.pnl)[0]
  if (worstSym && worstSym.pnl < 0 && worstSym.trades >= 3) recos.push(`${worstSym.symbol} pèse ${fmtE(worstSym.pnl)} : réévalue si cet instrument est vraiment dans ta zone de compétence.`)

  if (m.profitFactor != null && m.profitFactor < 1) recos.push(`Ton profit factor est sous 1 (${m.profitFactor.toFixed(2)}) : tes pertes dépassent tes gains. Resserre ton risque ou ta sélectivité.`)
  else if (m.payoff != null && m.payoff < 0.8 && winRate >= 50) recos.push(`Tu gagnes souvent mais petit et perds gros (ratio gain/perte ${m.payoff.toFixed(2)}). Laisse davantage courir tes gagnants.`)

  if (m.maxLossStreak >= 3) recos.push(`Tu as enchaîné jusqu'à ${m.maxLossStreak} pertes d'affilée. Fixe-toi une règle d'arrêt nette après 2 à 3 pertes.`)

  if (trendDelta != null && trendDelta <= -10) recos.push(`Ta discipline baisse nettement : reviens à un cadre simple (taille fixe, stop systématique) pour rétablir le score.`)

  if (recos.length === 0) recos.push(`Rien à corriger en priorité : sizing cohérent et discipline tenue. Garde exactement le même cadre.`)

  return recos.slice(0, 4)
}

// Comparaison avec la période précédente : tableau des métriques clés (précédent vs
// actuel) + 2 à 4 « axes d'amélioration / progrès » rédigés. Si pas de période précédente
// (premier rapport), hasPrev=false → section omise dans le PDF.
function buildComparison(opts: {
  prevLabel: string
  prevTrades: TradeLike[]
  prevAlerts: AlertLike[]
  cur: { avgScore: number; totalPnl: number; winRate: number; alertCount: number }
  prevAvgScore: number | null
}): Comparison {
  const { prevLabel, prevTrades, prevAlerts, cur, prevAvgScore } = opts
  const hasPrev = prevTrades.length > 0 || prevAlerts.length > 0
  if (!hasPrev) return { hasPrev: false, prevLabel, rows: [], points: [] }

  const prevClosed = prevTrades.filter(t => t.pnl != null)
  const prevPnl = prevClosed.reduce((s, t) => s + (t.pnl as number), 0)
  const prevWins = prevClosed.filter(t => (t.pnl as number) > 0).length
  const prevWinRate = prevClosed.length ? Math.round(prevWins / prevClosed.length * 100) : 0
  const prevAlertCount = prevAlerts.length

  const rows = [
    { label: 'Score moyen', prev: prevAvgScore != null ? String(prevAvgScore) : '—', cur: String(cur.avgScore), better: prevAvgScore != null ? cur.avgScore >= prevAvgScore : null },
    { label: 'P&L net', prev: fmtE(prevPnl), cur: fmtE(cur.totalPnl), better: cur.totalPnl >= prevPnl },
    { label: 'Réussite', prev: `${prevWinRate}%`, cur: `${cur.winRate}%`, better: cur.winRate >= prevWinRate },
    { label: 'Alertes', prev: String(prevAlertCount), cur: String(cur.alertCount), better: cur.alertCount <= prevAlertCount },
  ]

  const points: string[] = []
  if (prevAvgScore != null) {
    const d = cur.avgScore - prevAvgScore
    if (d >= 3) points.push(`Discipline en progrès : ${cur.avgScore}/100 contre ${prevAvgScore} la ${prevLabel} (+${d}).`)
    else if (d <= -3) points.push(`Discipline en recul : ${cur.avgScore}/100 contre ${prevAvgScore} (${d}). C'est l'axe prioritaire à retravailler.`)
  }
  const dAlerts = cur.alertCount - prevAlertCount
  if (dAlerts <= -2) points.push(`Moins de signaux comportementaux déclenchés (${cur.alertCount} contre ${prevAlertCount}). Tu gagnes en contrôle.`)
  else if (dAlerts >= 2) points.push(`Plus de signaux qu'avant (${cur.alertCount} contre ${prevAlertCount}) : reste vigilant sur tes automatismes.`)
  const dWR = cur.winRate - prevWinRate
  if (Math.abs(dWR) >= 5) points.push(`Taux de réussite ${dWR > 0 ? 'en hausse' : 'en baisse'} : ${cur.winRate}% contre ${prevWinRate}%.`)
  if (prevPnl < 0 && cur.totalPnl >= 0) points.push(`Résultat repassé positif (${fmtE(cur.totalPnl)} contre ${fmtE(prevPnl)}).`)
  else if (prevPnl >= 0 && cur.totalPnl < 0) points.push(`Résultat repassé négatif (${fmtE(cur.totalPnl)} contre ${fmtE(prevPnl)}). Reviens à ton cadre.`)
  if (points.length === 0) points.push(`Performance globalement stable par rapport à la ${prevLabel}. Continue sur le même rythme.`)

  return { hasPrev: true, prevLabel, rows, points: points.slice(0, 4) }
}

// Infos prop firm (état du challenge à l'instant du rapport) : avancement objectif +
// part de la meilleure journée vs seuil de consistance de la firme. null si mode inactif.
export async function fetchPropFirmInfo(
  service: any, userId: string
): Promise<PropFirmInfo | null> {
  const { data: rules } = await service.from('trading_rules').select('*').eq('user_id', userId).single()
  if (!rules) return null
  const active = (rules as any).prop_firm_active ?? !!(rules as any).prop_firm
  const firmId = (rules as any).prop_firm
  const startedAt = (rules as any).prop_firm_started_at
  if (!active || !firmId || !startedAt) return null
  const preset = PROPFIRM_PRESETS.find(p => p.id === firmId)
  if (!preset) return null

  const { data: chalTrades } = await service.from('trades')
    .select('pnl, entry_time').eq('user_id', userId).eq('status', 'closed').gte('entry_time', startedAt)
  const rows = (chalTrades ?? []) as { pnl: number | null; entry_time: string }[]
  const cumPnl = rows.reduce((s, t) => s + (t.pnl || 0), 0)
  const byDay = new Map<string, number>()
  for (const t of rows) { const d = (t.entry_time || '').slice(0, 10); if (d) byDay.set(d, (byDay.get(d) || 0) + (t.pnl || 0)) }
  const bestDay = Math.max(0, ...Array.from(byDay.values()))

  const phase = ((rules as any).prop_firm_phase as PropFirmPhase) || 'p1'
  const capital = Number((rules as any).account_size) || 10000
  const targetAmt = targetForPhase(preset, phase) * capital / 100
  const c = preset.consistency
  const consistencyApplies = !!(c && c.phases.includes(phase))

  return {
    name: preset.name,
    phase: PROPFIRM_PHASES.find(p => p.id === phase)?.label ?? 'Phase 1',
    progressPct: targetAmt > 0 ? Math.max(0, Math.min(999, Math.round(cumPnl / targetAmt * 100))) : null,
    bestDayShare: cumPnl > 0 && bestDay > 0 ? Math.round(bestDay / cumPnl * 100) : null,
    consistencyMax: consistencyApplies ? c!.maxDayShare : null,
  }
}

export function buildReportData(opts: {
  meta: { weekLabel: string; periodTitle: string; bucketUnit: string; generatedAt: string; userEmail: string; periodWord: string }
  buckets: Bucket[]
  trades: TradeLike[]
  alerts: AlertLike[]
  prevTrades: TradeLike[]
  prevAlerts: AlertLike[]
  propFirm?: PropFirmInfo | null
}): WeeklyReportData {
  const { meta, buckets, trades, alerts, prevTrades, prevAlerts } = opts

  const days: DayData[] = buckets.map(b => {
    const bTrades = trades.filter(t => t.entry_time >= b.startStr && t.entry_time < b.endStr)
    const bAlerts = alerts.filter(a => a.session_date >= b.startStr && a.session_date < b.endStr)
    return {
      date: b.startStr, label: b.label, score: computeScore(bAlerts),
      pnl: bTrades.reduce((s, t) => s + (t.pnl ?? 0), 0),
      tradeCount: bTrades.length, wins: bTrades.filter(t => (t.pnl ?? 0) > 0).length,
      alertCount: bAlerts.length,
    }
  })

  const tradingDays = days.filter(d => d.tradeCount > 0)
  const avgScore = tradingDays.length ? Math.round(tradingDays.reduce((s, d) => s + d.score, 0) / tradingDays.length) : 0
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const wins = trades.filter(t => (t.pnl ?? 0) > 0).length
  const winRate = trades.length ? Math.round(wins / trades.length * 100) : 0
  const criticalAlerts = alerts.filter(a => (a.level ?? 1) === 3).length

  const alertMap = new Map<string, { count: number; maxLevel: number }>()
  for (const a of alerts) {
    const ex = alertMap.get(a.type) ?? { count: 0, maxLevel: 1 }
    alertMap.set(a.type, { count: ex.count + 1, maxLevel: Math.max(ex.maxLevel, a.level ?? 1) })
  }
  const alertsByType: AlertTypeData[] = Array.from(alertMap.entries())
    .map(([type, v]) => ({ type, label: alertLabel(type), count: v.count, maxLevel: v.maxLevel }))
    .sort((a, b) => b.maxLevel - a.maxLevel || b.count - a.count)

  const tradeItems: TradeItem[] = trades.map(t => {
    const dt = new Date(t.entry_time)
    const tradeAlerts = alerts.filter(a =>
      a.trade_id ? a.trade_id === t.id
        : a.created_at ? Math.abs(new Date(a.created_at).getTime() - dt.getTime()) < 90000 : false
    )
    return {
      date: dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
      time: dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
      symbol: t.symbol, direction: (t.direction as 'long' | 'short'),
      size: t.size, pnl: t.pnl ?? 0, alertCount: tradeAlerts.length,
    }
  })

  const metrics = computeMetrics(trades)
  const sides = computeSides(trades)
  const symbols = computeSymbols(trades)
  const prevAvgScore = avgScoreOf(prevTrades, prevAlerts)
  const trendDelta = prevAvgScore != null ? avgScore - prevAvgScore : null
  const bestSym = [...symbols].sort((a, b) => b.pnl - a.pnl)[0] ?? null

  // Comparaison avec la période précédente (axes d'amélioration / progrès).
  const comparison = buildComparison({
    prevLabel: meta.periodWord === 'le mois' ? 'mois précédent' : 'semaine précédente',
    prevTrades, prevAlerts,
    cur: { avgScore, totalPnl, winRate, alertCount: alerts.length },
    prevAvgScore,
  })

  const narrative = buildNarrative({
    periodWord: meta.periodWord, totalTrades: trades.length, totalPnl, winRate, avgScore,
    trendDelta, topAlert: alertsByType[0] ?? null, criticalAlerts, bestSym,
  })
  const recommendations = trades.length > 0
    ? buildRecommendations({ metrics, sides, symbols, topAlert: alertsByType[0] ?? null, trendDelta, winRate })
    : []

  return {
    weekLabel: meta.weekLabel,
    periodTitle: meta.periodTitle,
    bucketUnit: meta.bucketUnit,
    generatedAt: meta.generatedAt,
    userEmail: meta.userEmail,
    days,
    summary: { avgScore, totalPnl, winRate, totalTrades: trades.length, totalAlerts: alerts.length, criticalAlerts },
    prevAvgScore,
    comparison,
    narrative,
    metrics,
    bySide: sides,
    bySymbol: symbols,
    recommendations,
    propFirm: opts.propFirm ?? null,
    alertsByType,
    trades: tradeItems,
  }
}
