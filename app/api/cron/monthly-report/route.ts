export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { WeeklyReport } from '@/lib/pdf/WeeklyReport'
import type { WeeklyReportData, DayData, AlertTypeData, TradeItem } from '@/lib/pdf/WeeklyReport'
import { sendWeeklyReportEmail } from '@/lib/brevo'
import { isPaidPlan, isVip } from '@/lib/plans'

// Rapport MENSUEL par email — envoyé à TOUS les utilisateurs payants (Pro + Max ;
// Caldra n'a pas de plan gratuit). Tourne le 1er du mois sur le mois précédent.
// Mise en forme = buckets par SEMAINE (même format que le rapport mensuel à la demande).

const ALERT_LABELS: Record<string, string> = {
  revenge_sizing: 'Revenge Sizing',
  immediate_reentry: 'Réentrée Impulsive',
  consecutive_losses: 'Pertes Consécutives',
  drawdown_alert: 'Drawdown',
  outside_session: 'Hors Session',
  overtrading: 'Overtrading',
}

function computeScore(alerts: { level?: number }[]): number {
  const deductions = alerts.reduce((sum, a) => {
    const level = a.level ?? 1
    if (level === 3) return sum + 18
    if (level === 2) return sum + 8
    return sum + 3
  }, 0)
  return Math.max(0, 100 - deductions)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() + n)
  return r
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Mois précédent [start, endExcl)
  const now = new Date()
  const y = now.getUTCFullYear(), m = now.getUTCMonth()
  const rangeStart = new Date(Date.UTC(y, m - 1, 1))
  const rangeEndExcl = new Date(Date.UTC(y, m, 1))
  const rangeStartStr = toISODate(rangeStart)
  const rangeEndStr = toISODate(rangeEndExcl)
  const monthLabel = rangeStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  // Buckets par semaine (S1, S2, …) bornés au mois.
  const buckets: { label: string; startStr: string; endStr: string }[] = []
  let ws = new Date(rangeStart), wi = 1
  while (ws < rangeEndExcl) {
    const weRaw = addDays(ws, 7)
    const we = weRaw < rangeEndExcl ? weRaw : rangeEndExcl
    buckets.push({ label: `S${wi}`, startStr: toISODate(ws), endStr: toISODate(we) })
    ws = weRaw; wi++
  }

  const { data: { users }, error: usersError } = await service.auth.admin.listUsers({ perPage: 1000 })
  if (usersError || !users) {
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }

  // Tous les payants (Pro + Max). Pas de plan gratuit → en pratique tous les users.
  const { data: profiles } = await service.from('user_profiles').select('user_id, plan')
  const planByUser = new Map((profiles ?? []).map(p => [p.user_id, p.plan as string]))

  let sent = 0
  let skipped = 0

  for (const user of users) {
    if (!user.email) { skipped++; continue }
    if (!isPaidPlan(planByUser.get(user.id)) && !isVip(user.email)) { skipped++; continue }

    const [{ data: trades }, { data: alerts }] = await Promise.all([
      service.from('trades').select('*').eq('user_id', user.id)
        .gte('entry_time', rangeStartStr).lt('entry_time', rangeEndStr).order('entry_time'),
      service.from('alerts').select('*').eq('user_id', user.id)
        .gte('session_date', rangeStartStr).lt('session_date', rangeEndStr).order('session_date'),
    ])

    const safeTrades = trades ?? []
    const safeAlerts = alerts ?? []
    if (safeTrades.length === 0) { skipped++; continue }

    const days: DayData[] = buckets.map(b => {
      const bTrades = safeTrades.filter(t => t.entry_time >= b.startStr && t.entry_time < b.endStr)
      const bAlerts = safeAlerts.filter(a => a.session_date >= b.startStr && a.session_date < b.endStr)
      const wins = bTrades.filter(t => (t.pnl ?? 0) > 0).length
      const pnl = bTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
      return { date: b.startStr, label: b.label, score: computeScore(bAlerts), pnl, tradeCount: bTrades.length, wins, alertCount: bAlerts.length }
    })

    const tradingDays = days.filter(d => d.tradeCount > 0)
    const avgScore = tradingDays.length > 0
      ? Math.round(tradingDays.reduce((s, d) => s + d.score, 0) / tradingDays.length) : 0
    const totalPnl = safeTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
    const wins = safeTrades.filter(t => (t.pnl ?? 0) > 0).length
    const winRate = safeTrades.length > 0 ? Math.round((wins / safeTrades.length) * 100) : 0
    const criticalAlerts = safeAlerts.filter(a => a.level === 3).length

    const alertMap = new Map<string, { count: number; maxLevel: number }>()
    for (const a of safeAlerts) {
      const existing = alertMap.get(a.type) ?? { count: 0, maxLevel: 1 }
      alertMap.set(a.type, { count: existing.count + 1, maxLevel: Math.max(existing.maxLevel, a.level ?? 1) })
    }
    const alertsByType: AlertTypeData[] = Array.from(alertMap.entries())
      .map(([type, v]) => ({ type, label: ALERT_LABELS[type] ?? type, count: v.count, maxLevel: v.maxLevel }))
      .sort((a, b) => b.maxLevel - a.maxLevel || b.count - a.count)

    const tradeItems: TradeItem[] = safeTrades.map(t => {
      const dt = new Date(t.entry_time)
      const tradeAlerts = safeAlerts.filter(a =>
        a.trade_id ? a.trade_id === t.id : Math.abs(new Date(a.created_at).getTime() - dt.getTime()) < 90000
      )
      return {
        date: dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
        time: dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        symbol: t.symbol, direction: t.direction as 'long' | 'short',
        size: t.size, pnl: t.pnl ?? 0, alertCount: tradeAlerts.length,
      }
    })

    const data: WeeklyReportData = {
      weekLabel: monthLabel,
      periodTitle: 'RAPPORT MENSUEL',
      bucketUnit: 'SEMAINE',
      generatedAt: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      userEmail: user.email,
      days,
      summary: { avgScore, totalPnl, winRate, totalTrades: safeTrades.length, totalAlerts: safeAlerts.length, criticalAlerts },
      alertsByType,
      trades: tradeItems,
    }

    try {
      const pdfBuffer = await renderToBuffer(React.createElement(WeeklyReport, { data }) as any)
      const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')
      await sendWeeklyReportEmail({
        to: user.email,
        kind: 'month',
        weekLabel: monthLabel,
        weekStart: rangeStartStr,
        pdfBase64,
        stats: data.summary,
      })
      sent++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, month: rangeStartStr })
}
