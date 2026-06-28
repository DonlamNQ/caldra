export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { WeeklyReport } from '@/lib/pdf/WeeklyReport'
import { buildReportData, fetchPropFirmInfo } from '@/lib/reportData'
import { isMaxPlan, isPaidPlan, isVip } from '@/lib/plans'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

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
  const vip = isVip(user.email)
  if (period === 'week' && !isMaxPlan(profile?.plan) && !vip) {
    return NextResponse.json({ error: 'Le rapport hebdomadaire est réservé au plan Max.' }, { status: 403 })
  }
  if (period === 'month' && !isPaidPlan(profile?.plan) && !vip) {
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

  // Période PRÉCÉDENTE (pour la tendance de discipline) + infos prop firm en parallèle.
  const prevStart = period === 'month'
    ? new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth() - 1, 1))
    : addDays(rangeStart, -7)
  const prevStartStr = toISODate(prevStart)
  const prevEndStr = rangeStartStr
  const [{ data: prevTrades }, { data: prevAlerts }, propFirm] = await Promise.all([
    service.from('trades').select('entry_time, pnl').eq('user_id', user.id).gte('entry_time', prevStartStr).lt('entry_time', prevEndStr),
    service.from('alerts').select('session_date, level').eq('user_id', user.id).gte('session_date', prevStartStr).lt('session_date', prevEndStr),
    fetchPropFirmInfo(service, user.id),
  ])

  const data = buildReportData({
    meta: {
      weekLabel: periodLabel,
      periodTitle,
      bucketUnit,
      generatedAt: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      userEmail: user.email ?? '',
      periodWord: period === 'month' ? 'le mois' : 'la semaine',
    },
    buckets,
    trades: safeTrades,
    alerts: safeAlerts,
    prevTrades: (prevTrades ?? []) as any,
    prevAlerts: (prevAlerts ?? []) as any,
    propFirm,
  })

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
