export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { WeeklyReport } from '@/lib/pdf/WeeklyReport'
import { buildReportData, fetchPropFirmInfo } from '@/lib/reportData'
import { sendWeeklyReportEmail } from '@/lib/brevo'
import { isPaidPlan, isVip } from '@/lib/plans'

// Rapport MENSUEL par email — envoyé à TOUS les utilisateurs payants (Pro + Max ;
// Caldra n'a pas de plan gratuit). Tourne le 1er du mois sur le mois précédent.
// Mise en forme = buckets par SEMAINE (même format que le rapport mensuel à la demande).

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
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
  const prevStartStr = toISODate(new Date(Date.UTC(y, m - 2, 1)))   // mois encore avant (tendance)
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

    const [{ data: prevTrades }, { data: prevAlerts }, propFirm] = await Promise.all([
      service.from('trades').select('entry_time, pnl').eq('user_id', user.id).gte('entry_time', prevStartStr).lt('entry_time', rangeStartStr),
      service.from('alerts').select('session_date, level').eq('user_id', user.id).gte('session_date', prevStartStr).lt('session_date', rangeStartStr),
      fetchPropFirmInfo(service, user.id),
    ])

    const data = buildReportData({
      meta: {
        weekLabel: monthLabel,
        periodTitle: 'RAPPORT MENSUEL',
        bucketUnit: 'SEMAINE',
        generatedAt: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        userEmail: user.email,
        periodWord: 'le mois',
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
