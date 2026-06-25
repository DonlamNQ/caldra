export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
import { isMaxPlan, isVip } from '@/lib/plans'
import { alertLabel } from '@/lib/alertLabels'

// Débrief de session HYBRIDE : les chiffres sont calculés ici (exacts, jamais
// inventés) ; Claude Haiku ne fait que rédiger un court bilan à partir de ces faits.
// Plan Max uniquement.

function computeScore(alerts: { level?: number | null }[]): number {
  const deductions = alerts.reduce((sum, a) => {
    const lvl = a.level ?? 1
    if (lvl === 3) return sum + 18
    if (lvl === 2) return sum + 8
    return sum + 3
  }, 0)
  return Math.max(0, 100 - deductions)
}

export async function POST(_req: NextRequest) {
  const cookieStore = cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await service
    .from('user_profiles').select('plan').eq('user_id', user.id).single()
  if (!isMaxPlan(profile?.plan) && !isVip(user.email)) {
    return NextResponse.json({ error: 'Le débrief de session est réservé au plan Max.' }, { status: 403 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Débrief indisponible.' }, { status: 503 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const haiku = async (system: string, content: string, maxTokens = 400) => {
    const msg = await anthropic.messages.create({ model: 'claude-haiku-4-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content }] })
    return (msg.content as any[]).filter(b => b.type === 'text').map(b => b.text).join('').trim()
  }

  const sp = new URL(_req.url).searchParams
  const period = sp.get('period')
  const { data: rules } = await service.from('trading_rules').select('*').eq('user_id', user.id).single()
  const accountSize = Number(rules?.account_size) || 10000

  // ══ PATTERNS RÉCURRENTS — débrief hebdo (7 j) ou mensuel (30 j) ════════════════
  if (period === 'week' || period === 'month') {
    const nbDays = period === 'week' ? 7 : 30
    const start = new Date(Date.now() - (nbDays - 1) * 86_400_000).toISOString().slice(0, 10)

    const [{ data: trades }, { data: alerts }] = await Promise.all([
      service.from('trades').select('symbol, pnl, entry_time').eq('user_id', user.id).gte('entry_time', start).order('entry_time'),
      service.from('alerts').select('type, level, session_date').eq('user_id', user.id).gte('session_date', start),
    ])
    const t = trades ?? []
    const a = alerts ?? []
    if (t.length < 4) {
      return NextResponse.json({ error: `Pas assez de trades sur ${period === 'week' ? 'la semaine' : 'le mois'} pour une analyse.` }, { status: 400 })
    }

    const dayOf = (iso: string) => iso.slice(0, 10)
    const tradingDays = new Set(t.map(x => dayOf(x.entry_time)))
    const totalPnl = t.reduce((s, x) => s + (x.pnl ?? 0), 0)
    const wins = t.filter(x => (x.pnl ?? 0) > 0).length
    const winRate = t.length ? Math.round((wins / t.length) * 100) : 0

    // Score moyen par jour tradé
    const alertsByDay: Record<string, { level?: number | null }[]> = {}
    for (const al of a) { const d = al.session_date as string; if (d) (alertsByDay[d] ||= []).push(al) }
    const dayScores = [...tradingDays].map(d => computeScore(alertsByDay[d] ?? []))
    const avgScore = dayScores.length ? Math.round(dayScores.reduce((s, v) => s + v, 0) / dayScores.length) : 100

    // P&L par jour → meilleur / pire jour + jours en drawdown
    const pnlByDay: Record<string, number> = {}
    for (const x of t) { const d = dayOf(x.entry_time); pnlByDay[d] = (pnlByDay[d] ?? 0) + (x.pnl ?? 0) }
    const dayList = Object.entries(pnlByDay)
    const best = dayList.reduce((m, e) => (m == null || e[1] > m[1] ? e : m), null as [string, number] | null)
    const worst = dayList.reduce((m, e) => (m == null || e[1] < m[1] ? e : m), null as [string, number] | null)
    let ddBreachDays = 0
    if (rules?.max_daily_drawdown_pct) for (const [, p] of dayList) {
      if (Math.abs(Math.min(0, p) / accountSize) * 100 >= rules.max_daily_drawdown_pct) ddBreachDays++
    }

    // Schémas récurrents : nb d'occurrences + nb de jours distincts
    const cnt: Record<string, number> = {}
    const daysOfType: Record<string, Set<string>> = {}
    for (const al of a) { const ty = al.type; if (!ty) continue; cnt[ty] = (cnt[ty] ?? 0) + 1; (daysOfType[ty] ||= new Set()).add(al.session_date as string) }
    const patterns = Object.entries(cnt).sort((x, y) => y[1] - x[1]).slice(0, 4)
      .map(([ty, n]) => `${alertLabel(ty)} : ${n}× sur ${daysOfType[ty].size} jour(s)`)

    const facts = [
      `Période analysée : ${nbDays} derniers jours · ${tradingDays.size} jours tradés`,
      `Score de discipline moyen : ${avgScore}/100`,
      `P&L net : ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}€`,
      `${t.length} trades · win rate ${winRate}%`,
      patterns.length ? `Schémas récurrents : ${patterns.join(' ; ')}` : `Aucun schéma à risque récurrent`,
      best && worst ? `Meilleur jour : ${best[0]} (${best[1] >= 0 ? '+' : ''}${best[1].toFixed(0)}€) · Pire jour : ${worst[0]} (${worst[1].toFixed(0)}€)` : null,
      ddBreachDays > 0 ? `Limite de drawdown dépassée sur ${ddBreachDays} jour(s)` : `Limite de drawdown respectée chaque jour`,
    ].filter(Boolean).join('\n')

    const systemP = `Tu es le mentor de Caldra : posé, bienveillant, factuel. On te fournit les FAITS EXACTS d'une PÉRIODE de trading (${period === 'week' ? 'la semaine' : 'le mois'}).
Règles :
- N'invente AUCUN chiffre. Utilise UNIQUEMENT les faits fournis, ne recalcule rien.
- Ton calme et constructif, JAMAIS accusateur ni culpabilisant. Tournures neutres.
- Aucune métaphore dramatisante, aucun emoji.
- Identifie le ou les 1-2 SCHÉMAS RÉCURRENTS les plus marquants (ceux qui reviennent sur plusieurs jours) et leur effet probable.
- En français, tutoiement, 4 à 6 phrases pour l'analyse.
- Termine OBLIGATOIREMENT par un plan d'action de 1 à 2 points concrets et réalistes pour la période suivante, chacun sur sa ligne préfixée par "• ".
- Tu peux mettre en gras (**…**) 1 ou 2 termes clés.`

    try {
      const debrief = await haiku(systemP, `Faits de la période :\n${facts}`, 500)
      if (!debrief) return NextResponse.json({ error: 'Analyse vide.' }, { status: 502 })
      return NextResponse.json({ debrief, period, avgScore, totalPnl })
    } catch {
      return NextResponse.json({ error: "Erreur lors de l'analyse." }, { status: 502 })
    }
  }

  // ══ DÉBRIEF DE SESSION (jour) ══════════════════════════════════════════════════
  // Jour ciblé : ?date=YYYY-MM-DD précis, ?latest=1 = dernière journée avec trades,
  // sinon aujourd'hui (déclenchement auto à la clôture).
  const dateParam = sp.get('date')
  let day = new Date().toISOString().split('T')[0]
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    day = dateParam
  } else if (sp.get('latest') === '1') {
    const { data: lt } = await service.from('trades')
      .select('entry_time').eq('user_id', user.id)
      .order('entry_time', { ascending: false }).limit(1).maybeSingle()
    if (lt?.entry_time) day = lt.entry_time.split('T')[0]
  }
  const dayEnd = `${day}T23:59:59.999Z`

  const [{ data: trades }, { data: alerts }] = await Promise.all([
    service.from('trades').select('*').eq('user_id', user.id).gte('entry_time', day).lte('entry_time', dayEnd).order('entry_time'),
    service.from('alerts').select('type, level').eq('user_id', user.id).eq('session_date', day),
  ])

  const t = trades ?? []
  const a = alerts ?? []
  if (t.length === 0) {
    return NextResponse.json({ error: "Aucun trade aujourd'hui." }, { status: 400 })
  }

  // ── Faits déterministes (jamais envoyés au modèle pour recalcul) ─────────────
  const score = computeScore(a)
  const totalPnl = t.reduce((s, x) => s + (x.pnl ?? 0), 0)
  const wins = t.filter(x => (x.pnl ?? 0) > 0).length
  const losses = t.filter(x => (x.pnl ?? 0) < 0).length
  const winRate = t.length ? Math.round((wins / t.length) * 100) : 0

  const counts: Record<string, number> = {}
  for (const al of a) { const ty = al.type; if (ty) counts[ty] = (counts[ty] ?? 0) + 1 }
  const detectors = Object.entries(counts).sort((x, y) => y[1] - x[1]).map(([ty, n]) => `${alertLabel(ty)} ×${n}`)

  const worst = t.reduce<typeof t[number] | null>((m, x) => (m == null || (x.pnl ?? 0) < (m.pnl ?? 0)) ? x : m, null)

  const sorted = [...t].sort((x, y) => new Date(y.entry_time).getTime() - new Date(x.entry_time).getTime())
  let streak = 0
  for (const x of sorted) { if ((x.pnl ?? 0) < 0) streak++; else break }

  const ddPct = Math.abs(Math.min(0, totalPnl) / accountSize) * 100
  const breaches: string[] = []
  if (rules?.max_trades_per_session && t.length >= rules.max_trades_per_session)
    breaches.push(`limite de trades atteinte (${t.length}/${rules.max_trades_per_session})`)
  if (rules?.max_daily_drawdown_pct && ddPct >= rules.max_daily_drawdown_pct)
    breaches.push(`drawdown max dépassé (${ddPct.toFixed(1)}% / ${rules.max_daily_drawdown_pct}%)`)

  const factsList = [
    `Score de discipline : ${score}/100`,
    `P&L net : ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}€`,
    `${t.length} trades — ${wins} gagnants, ${losses} perdants (win rate ${winRate}%)`,
    detectors.length ? `Schémas à risque déclenchés : ${detectors.join(', ')}` : `Aucun schéma à risque déclenché`,
    streak >= 2 ? `Série de ${streak} pertes consécutives en fin de session` : null,
    worst && (worst.pnl ?? 0) < 0 ? `Pire trade : ${worst.symbol} (${(worst.pnl ?? 0).toFixed(2)}€)` : null,
    breaches.length ? `Règles enfreintes : ${breaches.join(' ; ')}` : `Toutes les règles fixées ont été respectées`,
  ].filter(Boolean).join('\n')

  const system = `Tu es le mentor de Caldra : posé et bienveillant, tu aides le trader à prendre du recul sur sa session. On te fournit les FAITS EXACTS d'une session.
Règles :
- N'invente AUCUN chiffre. Utilise UNIQUEMENT les faits fournis, ne recalcule rien.
- Ton calme, bienveillant et constructif — JAMAIS accusateur, moralisateur ou culpabilisant. Tu observes et tu accompagnes, tu ne juges pas. Évite « tu as échoué », « tu n'as pas respecté », « mauvais ». Préfère des tournures neutres : « la session a vu… », « il y a eu… ».
- Commence par un constat factuel ou un point d'appui positif quand c'est possible.
- Présente les schémas à risque comme des observations utiles pour progresser, pas comme des reproches.
- Aucune métaphore dramatisante (crash, mur, guerre…), aucun emoji.
- 3 à 4 phrases maximum, en français, au tutoiement.
- Termine par UNE piste concrète et encourageante pour la prochaine session.
- Tu peux mettre en gras (**…**) 1 ou 2 termes clés au maximum.`

  try {
    const debrief = await haiku(system, `Faits de la session du jour :\n${factsList}`, 350)
    if (!debrief) return NextResponse.json({ error: 'Débrief vide.' }, { status: 502 })
    return NextResponse.json({ debrief, score, totalPnl })
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la génération du débrief.' }, { status: 502 })
  }
}
