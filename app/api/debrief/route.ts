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

  // Jour ciblé : ?date=YYYY-MM-DD précis, ?latest=1 = dernière journée avec trades,
  // sinon aujourd'hui (déclenchement auto à la clôture).
  const sp = new URL(_req.url).searchParams
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

  const [{ data: trades }, { data: alerts }, { data: rules }] = await Promise.all([
    service.from('trades').select('*').eq('user_id', user.id).gte('entry_time', day).lte('entry_time', dayEnd).order('entry_time'),
    service.from('alerts').select('type, level').eq('user_id', user.id).eq('session_date', day),
    service.from('trading_rules').select('*').eq('user_id', user.id).single(),
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

  const accountSize = Number(rules?.account_size) || 10000
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

  const system = `Tu es le coach de discipline de Caldra, un outil de suivi comportemental pour traders. On te fournit les FAITS EXACTS d'une session.
Règles absolues :
- N'invente AUCUN chiffre. Utilise UNIQUEMENT les faits fournis, ne recalcule rien.
- Ton factuel et sobre. Aucune métaphore dramatisante (crash, mur, prière, guerre…), aucun emoji.
- 3 à 4 phrases maximum, en français, au tutoiement.
- Parle de COMPORTEMENT et de discipline, jamais de prédiction de marché.
- Termine par UN seul conseil actionnable pour la prochaine session.
- Tu peux mettre en gras (**…**) 1 ou 2 termes clés au maximum.`

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 350,
      system,
      messages: [{ role: 'user', content: `Faits de la session du jour :\n${factsList}` }],
    })
    const debrief = (msg.content as any[])
      .filter(b => b.type === 'text').map(b => b.text).join('').trim()
    if (!debrief) return NextResponse.json({ error: 'Débrief vide.' }, { status: 502 })
    return NextResponse.json({ debrief, score, totalPnl })
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la génération du débrief.' }, { status: 502 })
  }
}
