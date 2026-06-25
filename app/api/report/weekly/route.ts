export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { WeeklyReport } from '@/lib/pdf/WeeklyReport'
import type { WeeklyReportData, DayData, AlertTypeData, TradeItem } from '@/lib/pdf/WeeklyReport'
import { isMaxPlan, isPaidPlan } from '@/lib/plans'

const ALERT_LABELS: Record<string, string> = {
  revenge_sizing: 'Revenge Sizing',
  immediate_reentry: 'Réentrée Impulsive',
  consecutive_losses: 'Pertes Consécutives',
  drawdown_alert: 'Drawdown',
  outside_session: 'Hors Session',
  overtrading: 'Overtrading',
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function computeScore(alerts: { level?: number }[]): number {
  const deductions = alerts.reduce((sum, a) => {
    const level = a.level ?? 1
    if (level === 3) return sum + 18
    if (level === 2) return sum + 8
    return sum + 3
  }, 0)
  return Math.max(0, 100 - deductions)
}

// Monday of a given ISO date string
function getMondayOf(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00Z')
  const dow = d.getUTCDay() // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow
  d.setUTCDate(d.getUTCDate() + diff)
  return d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() + n)
  return r
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function frLabel(d: Date): string {
  const dow = WEEKDAYS[(d.getUTCDay() + 6) % 7]
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dow} ${dd}/${mm}`
}

function weekLabel(monday: Date): string {
  const sunday = addDays(monday, 6)
  const fmtDay = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  const endFull = sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return `${fmtDay(monday)} – ${endFull}`
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies()

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) {
          try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Période : 'week' (hebdo, plan Max) ou 'month' (mensuel, tous plans payants).
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') === 'month' ? 'month' : 'week'

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await service
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .single()
  if (period === 'week' && !isMaxPlan(profile?.plan)) {
    return NextResponse.json({ error: 'Le rapport hebdomadaire est réservé au plan Max.' }, { status: 403 })
  }
  if (period === 'month' && !isPaidPlan(profile?.plan)) {
    return NextResponse.json({ error: 'Le rapport mensuel nécessite un abonnement.' }, { status: 403 })
  }

  // Plage [rangeStart, rangeEndExcl) + découpage en buckets : un par jour ouvré
  // (semaine) ou un par semaine (mois), pour garder les graphes lisibles.
  let rangeStart: Date
  let rangeEndExcl: Date
  let periodTitle: string
  let bucketUnit: string
  let periodLabel: string
  const buckets: { label: string; startStr: string; endStr: string }[] = []

  if (period === 'month') {
    const monthParam = searchParams.get('month') // 'YYYY-MM'
    const base = monthParam ? new Date(monthParam + '-01T00:00:00Z') : new Date()
    const y = base.getUTCFullYear(), m = base.getUTCMonth()
    rangeStart = new Date(Date.UTC(y, m, 1))
    rangeEndExcl = new Date(Date.UTC(y, m + 1, 1))
    periodTitle = 'RAPPORT MENSUEL'
    bucketUnit = 'SEMAINE'
    periodLabel = rangeStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    let ws = new Date(rangeStart), wi = 1
    while (ws < rangeEndExcl) {
      const weRaw = addDays(ws, 7)
      const we = weRaw < rangeEndExcl ? weRaw : rangeEndExcl
      buckets.push({ label: `S${wi}`, startStr: toISODate(ws), endStr: toISODate(we) })
      ws = weRaw; wi++
    }
  } else {
    const weekStartParam = searchParams.get('week_start')
    const monday = weekStartParam
      ? new Date(weekStartParam + 'T00:00:00Z')
      : getMondayOf(toISODate(new Date()))
    rangeStart = monday
    rangeEndExcl = addDays(monday, 7)
    periodTitle = 'RAPPORT HEBDOMADAIRE'
    bucketUnit = 'JOUR'
    periodLabel = weekLabel(monday)
    for (let i = 0; i < 7; i++) {
      const day = addDays(monday, i)
      const dow = day.getUTCDay()
      if (dow === 0 || dow === 6) continue // jours ouvrés seulement
      buckets.push({ label: frLabel(day), startStr: toISODate(day), endStr: toISODate(addDays(day, 1)) })
    }
  }

  const rangeStartStr = toISODate(rangeStart)
  const rangeEndStr = toISODate(rangeEndExcl)

  const [{ data: trades }, { data: alerts }] = await Promise.all([
    service
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_time', rangeStartStr)
      .lt('entry_time', rangeEndStr)
      .order('entry_time'),
    service
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .gte('session_date', rangeStartStr)
      .lt('session_date', rangeEndStr)
      .order('session_date'),
  ])

  const safeTrades = trades ?? []
  const safeAlerts = alerts ?? []

  // Données par bucket
  const days: DayData[] = buckets.map(b => {
    const bTrades = safeTrades.filter(t => t.entry_time >= b.startStr && t.entry_time < b.endStr)
    const bAlerts = safeAlerts.filter(a => a.session_date >= b.startStr && a.session_date < b.endStr)
    const wins = bTrades.filter(t => (t.pnl ?? 0) > 0).length
    const pnl = bTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
    return {
      date: b.startStr,
      label: b.label,
      score: computeScore(bAlerts),
      pnl,
      tradeCount: bTrades.length,
      wins,
      alertCount: bAlerts.length,
    }
  })

  // Summary
  const tradingDays = days.filter(d => d.tradeCount > 0)
  const avgScore = tradingDays.length > 0
    ? Math.round(tradingDays.reduce((s, d) => s + d.score, 0) / tradingDays.length)
    : 0
  const totalPnl = safeTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const wins = safeTrades.filter(t => (t.pnl ?? 0) > 0).length
  const winRate = safeTrades.length > 0 ? Math.round((wins / safeTrades.length) * 100) : 0
  const criticalAlerts = safeAlerts.filter(a => a.level === 3).length

  // Alerts by type
  const alertMap = new Map<string, { count: number; maxLevel: number }>()
  for (const a of safeAlerts) {
    const existing = alertMap.get(a.type) ?? { count: 0, maxLevel: 1 }
    alertMap.set(a.type, {
      count: existing.count + 1,
      maxLevel: Math.max(existing.maxLevel, a.level ?? 1),
    })
  }
  const alertsByType: AlertTypeData[] = Array.from(alertMap.entries())
    .map(([type, v]) => ({
      type,
      label: ALERT_LABELS[type] ?? type,
      count: v.count,
      maxLevel: v.maxLevel,
    }))
    .sort((a, b) => b.maxLevel - a.maxLevel || b.count - a.count)

  // Trade items
  const tradeItems: TradeItem[] = safeTrades.map(t => {
    const dt = new Date(t.entry_time)
    const tradeAlerts = safeAlerts.filter(a =>
      a.trade_id ? a.trade_id === t.id
        : Math.abs(new Date(a.created_at).getTime() - dt.getTime()) < 90000
    )
    return {
      date: dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
      time: dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
      symbol: t.symbol,
      direction: t.direction as 'long' | 'short',
      size: t.size,
      pnl: t.pnl ?? 0,
      alertCount: tradeAlerts.length,
    }
  })

  const data: WeeklyReportData = {
    weekLabel: periodLabel,
    periodTitle,
    bucketUnit,
    generatedAt: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    userEmail: user.email ?? '',
    days,
    summary: {
      avgScore,
      totalPnl,
      winRate,
      totalTrades: safeTrades.length,
      totalAlerts: safeAlerts.length,
      criticalAlerts,
    },
    alertsByType,
    trades: tradeItems,
  }

  const pdfBuffer = await renderToBuffer(React.createElement(WeeklyReport, { data }) as any)

  const filename = `caldra-rapport-${period === 'month' ? 'mensuel' : 'hebdo'}-${rangeStartStr}.pdf`
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-cache',
    },
  })
}
