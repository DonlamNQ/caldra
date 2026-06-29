export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { WeeklyReport } from '@/lib/pdf/WeeklyReport'
import { buildReportData, fetchPropFirmInfo, type Bucket } from '@/lib/reportData'
import { sendWeeklyReportEmail } from '@/lib/brevo'
import { isMaxPlan, isVip } from '@/lib/plans'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

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
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
  const prevStartStr = toISODate(addDays(monday, -7))   // semaine d'avant (tendance)
  const wLabel = weekLabel(monday)

  // Buckets = jours ouvrés de la semaine.
  const buckets: Bucket[] = []
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i)
    const dow = day.getUTCDay()
    if (dow === 0 || dow === 6) continue
    buckets.push({ label: frLabel(day), startStr: toISODate(day), endStr: toISODate(addDays(day, 1)) })
  }

  const { data: { users }, error: usersError } = await service.auth.admin.listUsers({ perPage: 1000 })
  if (usersError || !users) {
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }

  // Rapport HEBDOMADAIRE = réservé au plan Max (le mensuel ira à tous les payants
  // via son propre cron). On charge les plans une fois pour gater dans la boucle.
  const { data: profiles } = await service.from('user_profiles').select('user_id, plan')
  const planByUser = new Map((profiles ?? []).map(p => [p.user_id, p.plan as string]))

  let sent = 0
  let skipped = 0

  for (const user of users) {
    if (!user.email) { skipped++; continue }
    if (!isMaxPlan(planByUser.get(user.id)) && !isVip(user.email)) { skipped++; continue }

    const [{ data: trades }, { data: alerts }] = await Promise.all([
      service.from('trades').select('*').eq('user_id', user.id)
        .gte('entry_time', weekStartStr).lt('entry_time', weekEndStr).order('entry_time'),
      service.from('alerts').select('*').eq('user_id', user.id)
        .gte('session_date', weekStartStr).lt('session_date', weekEndStr).order('session_date'),
    ])

    const safeTrades = trades ?? []
    const safeAlerts = alerts ?? []

    if (safeTrades.length === 0) { skipped++; continue }

    const [{ data: prevTrades }, { data: prevAlerts }, propFirm] = await Promise.all([
      service.from('trades').select('entry_time, pnl').eq('user_id', user.id).gte('entry_time', prevStartStr).lt('entry_time', weekStartStr),
      service.from('alerts').select('session_date, level').eq('user_id', user.id).gte('session_date', prevStartStr).lt('session_date', weekStartStr),
      fetchPropFirmInfo(service, user.id),
    ])

    const data = buildReportData({
      meta: {
        weekLabel: wLabel,
        periodTitle: 'RAPPORT HEBDOMADAIRE',
        bucketUnit: 'JOUR',
        generatedAt: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        userEmail: user.email,
        periodWord: 'la semaine',
      },
      buckets,
      trades: safeTrades,
      alerts: safeAlerts,
      prevTrades: (prevTrades ?? []) as any,
      prevAlerts: (prevAlerts ?? []) as any,
      propFirm,
    })

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
