import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import DashboardClient from './DashboardClient'
import { isVip } from '@/lib/plans'
import type { AlertRow } from '@/components/dashboard/AlertFeed'
import type { TradeRow } from '@/components/dashboard/TradeLog'

export interface DaySession {
  date: string
  score: number
  pnl: number
  tradeCount: number
  wins: number
  alertCount: number
  criticalAlerts: number
  alerts: Array<{ level: number; type: string; message: string }>
}

function computeScore(alerts: { level?: number; severity?: number }[]): number {
  const deductions = alerts.reduce((sum, a) => {
    const level = a.level ?? a.severity ?? 1
    if (level === 3) return sum + 18
    if (level === 2) return sum + 8
    return sum + 3
  }, 0)
  return Math.max(0, 100 - deductions)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // La Session live (tape, ligne de session, score comportemental, stats terminal) =
  // toujours le JOUR complet (minuit → maintenant), même en prop firm : ces vues relèvent
  // de la journée et du trader, pas du challenge. Un changement/redémarrage de challenge
  // en cours de journée ne doit donc PAS effacer ta session ni ton comportemental.
  // Seuls les CHIFFRES du challenge (objectif, marges, P&L cumulé, courbe « Solde du
  // compte », jours, phase) sont scopés à l'activation — côté client (activePropStart).
  const { data: rules } = await service.from('trading_rules').select('*').eq('user_id', user.id).single()

  const todayAlertsQuery = service.from('alerts').select('*').eq('user_id', user.id).eq('session_date', today)
    .order('level', { ascending: false }).order('created_at', { ascending: false })

  const [
    { data: todayAlerts },
    { data: todayTrades },
    { data: histTrades },
    { data: histAlerts },
    { data: apiKey },
    { data: yesterdayAlerts },
    { data: yesterdayTrades },
    { data: profile },
    { data: ctraderAccount },
    { data: lastTrade },
    { data: mt5Accounts },
    { data: tradovateAccounts },
    { data: allAlertTypes },
  ] = await Promise.all([
    todayAlertsQuery,
    service.from('trades').select('*').eq('user_id', user.id).gte('entry_time', today)
      .order('entry_time', { ascending: false }).limit(50),
    service.from('trades').select('id,symbol,direction,size,entry_price,exit_price,pnl,entry_time,exit_time,stop_loss')
      .eq('user_id', user.id).gte('entry_time', thirtyDaysAgo).lt('entry_time', today)
      .order('entry_time'),
    service.from('alerts').select('session_date,level,type,message')
      .eq('user_id', user.id).gte('session_date', thirtyDaysAgo).lt('session_date', today),
    service.from('api_keys').select('key_prefix,created_at').eq('user_id', user.id).eq('label', 'main').limit(1).single(),
    service.from('alerts').select('level').eq('user_id', user.id).eq('session_date', yesterday),
    service.from('trades').select('pnl').eq('user_id', user.id)
      .gte('entry_time', yesterday).lt('entry_time', today),
    service.from('user_profiles').select('plan').eq('user_id', user.id).single(),
    service.from('ctrader_accounts').select('id, status, ctid_trader_account_id').eq('user_id', user.id),
    service.from('trades').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    service.from('mt5_accounts').select('status').eq('user_id', user.id),
    service.from('tradovate_accounts').select('tradovate_account_id').eq('user_id', user.id),
    service.from('alerts').select('type').eq('user_id', user.id),
  ])

  // Compteurs de patterns sur TOUTE la durée (pour Analytics → Comportement)
  const allTimePatterns: Record<string, number> = {}
  for (const r of allAlertTypes ?? []) { const ty = (r as { type?: string }).type; if (ty) allTimePatterns[ty] = (allTimePatterns[ty] ?? 0) + 1 }

  // Today
  const safeAlerts: AlertRow[] = todayAlerts ?? []
  const safeTrades: TradeRow[] = todayTrades ?? []
  const totalPnl = safeTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const wins = safeTrades.filter(t => (t.pnl ?? 0) > 0).length
  const losses = safeTrades.filter(t => (t.pnl ?? 0) < 0).length

  // Yesterday
  const yesterdayPnl = (yesterdayTrades ?? []).reduce((s, t) => s + (t.pnl ?? 0), 0)
  const yesterdayScore = computeScore(yesterdayAlerts ?? [])
  const yesterdayData = (yesterdayTrades?.length ?? 0) > 0 || (yesterdayAlerts?.length ?? 0) > 0
    ? { score: yesterdayScore, pnl: yesterdayPnl, alerts: yesterdayAlerts?.length ?? 0 }
    : null

  // Historical sessions for calendar
  const tradesByDate: Record<string, typeof histTrades> = {}
  for (const t of histTrades ?? []) {
    const date = t.entry_time.split('T')[0]
    if (!tradesByDate[date]) tradesByDate[date] = []
    tradesByDate[date]!.push(t)
  }

  const alertsByDate: Record<string, typeof histAlerts> = {}
  for (const a of histAlerts ?? []) {
    if (!a.session_date) continue
    if (!alertsByDate[a.session_date]) alertsByDate[a.session_date] = []
    alertsByDate[a.session_date]!.push(a)
  }

  const allDates = new Set([...Object.keys(tradesByDate), ...Object.keys(alertsByDate)])
  const historicalSessions: DaySession[] = Array.from(allDates)
    .sort()
    .map(date => {
      const dayTrades = tradesByDate[date] ?? []
      const dayAlerts = alertsByDate[date] ?? []
      const pnl = dayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
      const w = dayTrades.filter(t => (t.pnl ?? 0) > 0).length
      return {
        date,
        score: computeScore(dayAlerts),
        pnl,
        tradeCount: dayTrades.length,
        wins: w,
        alertCount: dayAlerts.length,
        criticalAlerts: dayAlerts.filter(a => a.level === 3).length,
        alerts: dayAlerts.map(a => ({ level: a.level ?? 1, type: a.type ?? '', message: a.message ?? '' })),
      }
    })

  // Trades pour le Journal de trading (Analytics) — 30j + aujourd'hui, fermés seulement
  const journalTrades = [...(histTrades ?? []), ...safeTrades]
    .filter((t: any) => t.pnl != null && t.exit_price != null)
    .map((t: any) => ({
      symbol: t.symbol, direction: t.direction, size: t.size,
      entry_price: t.entry_price ?? null, exit_price: t.exit_price ?? null,
      pnl: t.pnl ?? null, entry_time: t.entry_time, exit_time: t.exit_time ?? null,
      stop_loss: t.stop_loss ?? null,
    }))

  const meta = user.user_metadata ?? {}

  const ctraderRows = ctraderAccount ?? []
  // Le "conflit" (double connexion) est un signal ÉPHÉMÈRE : il s'affiche en live
  // via le poll client pendant la tentative, mais ne doit pas persister. À chaque
  // (re)chargement on purge le placeholder en conflit → un refresh repart propre,
  // et le conflit ne réapparaît que sur une nouvelle tentative de double connexion.
  if (ctraderRows.some(r => (r as { status?: string }).status === 'conflict')) {
    await service.from('ctrader_accounts').delete().eq('user_id', user.id).eq('status', 'conflict')
  }
  const liveRows = ctraderRows.filter(r => (r as { status?: string }).status !== 'conflict')
  const ctraderConflict = false
  // "Connecté" = le worker a résolu un vrai compte (ctid). Avant ça, c'est juste
  // le placeholder OAuth → on affiche "connexion en cours", pas "connecté".
  const ctraderResolved = liveRows.some(r => (r as { ctid_trader_account_id?: number }).ctid_trader_account_id != null)
  const ctraderConnected = ctraderResolved
  const ctraderPending = liveRows.length > 0 && !ctraderResolved

  // "Plateforme connectée" = au moins une intégration active (cTrader/MT5/Tradovate)
  // OU au moins un trade déjà reçu. Sert à masquer l'invite "connectez votre plateforme".
  const mt5Connected = (mt5Accounts ?? []).some((r: { status?: string }) => r.status === 'connected')
  const tvConnected = (tradovateAccounts ?? []).some((r: { tradovate_account_id?: number | null }) => r.tradovate_account_id != null)
  const platformConnected = ctraderConnected || mt5Connected || tvConnected || !!lastTrade

  return (
    <DashboardClient
      userId={user.id}
      userEmail={user.email ?? ''}
      initialScore={computeScore(safeAlerts)}
      initialAlerts={safeAlerts}
      initialTrades={safeTrades}
      initialStats={{ total_trades: safeTrades.length, total_pnl: totalPnl, wins, losses }}
      yesterdayStats={yesterdayData}
      tradingRules={rules ?? null}
      apiKeyPrefix={apiKey?.key_prefix ?? null}
      historicalSessions={historicalSessions}
      journalTrades={journalTrades}
      plan={isVip(user.email) ? 'max' : (profile?.plan ?? 'free')}
      userMeta={{ first_name: meta.first_name, last_name: meta.last_name, phone: meta.phone }}
      ctraderConnected={ctraderConnected}
      ctraderConflict={ctraderConflict}
      ctraderPending={ctraderPending}
      lastTradeAt={lastTrade?.created_at ?? null}
      platformConnected={platformConnected}
      allTimePatterns={allTimePatterns}
    />
  )
}
