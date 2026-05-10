export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { WeeklyReport } from '@/lib/pdf/WeeklyReport'
import type { WeeklyReportData, DayData, AlertTypeData, TradeItem } from '@/lib/pdf/WeeklyReport'
import { sendWeeklyReportEmail } from '@/lib/brevo'

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

function getPreviousMonday(): Date {
  const now = new Date()
  const dow = now.getUTCDay()
  const daysBack = dow === 0 ? 13 : dow + 6
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - daysBack)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
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
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const monday = getPreviousMonday()
  const sunday = addDays(monday, 6)
  const weekStartStr = toISODate(monday)
  const weekEndStr = toISODate(addDays(sunday, 1))
  const wLabel = weekLabel(monday)

  const { data: { users }, error: usersError } = await service.auth.admin.listUsers({ perPage: 1000 })
  if (usersError || !users) {
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }

  let sent = 0
  let skipped = 0

  for (const user of users) {
    if (!user.email) { skipped++; continue }

    const [{ data: trades }, { data: alerts }] = await Promise.all([
      service.from('trades').select('*').eq('user_id', user.id)
        .gte('entry_time', weekStartStr).lt('entry_time', weekEndStr).order('entry_time'),
      service.from('alerts').select('*').eq('user_id', user.id)
        .gte('session_date', weekStartStr).lt('session_date', weekEndStr).order('session_date'),
    ])

    const safeTrades = trades ?? []
    const safeAlerts = alerts ?? []

    if (safeTrades.length === 0) { skipped++; continue }

    // Build day data
    const days: DayData[] = []
    for (let i = 0; i < 7; i++) {
      const day = addDays(monday, i)
      const dow = day.getUTCDay()
      if (dow === 0 || dow === 6) continue
      const dateStr = toISODate(day)
      const dayTrades = safeTrades.filter(t => t.entry_time?.startsWith(dateStr))
      const dayAlerts = safeAlerts.filter(a => a.session_date === dateStr)
      const wins = dayTrades.filter(t => (t.pnl ?? 0) > 0).length
      const pnl = dayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
      days.push({
        date: dateStr, label: frLabel(day),
        score: computeScore(dayAlerts), pnl,
        tradeCount: dayTrades.length, wins, alertCount: dayAlerts.length,
      })
    }

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
      weekLabel: wLabel,
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
        weekLabel: wLabel,
        weekStart: weekStartStr,
        pdfBase64,
        stats: data.summary,
      })
      sent++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, week: weekStartStr })
}
