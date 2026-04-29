import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(s) { try { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await service
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  if (profile?.plan !== 'sentinel') {
    return NextResponse.json({ error: 'Plan Sentinel requis' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const date: string = body.date ?? new Date().toISOString().split('T')[0]
  const nextDay = new Date(new Date(date).getTime() + 86400000).toISOString()

  const [{ data: trades }, { data: alerts }] = await Promise.all([
    service
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_time', date)
      .lt('entry_time', nextDay)
      .order('entry_time'),
    service
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_date', date)
      .order('created_at'),
  ])

  if (!trades?.length) {
    return NextResponse.json({ date, debrief: 'Aucun trade enregistré pour cette session.' })
  }

  const totalPnl = trades.reduce((s: number, t: { pnl?: number }) => s + (t.pnl ?? 0), 0)
  const wins = trades.filter((t: { pnl?: number }) => (t.pnl ?? 0) > 0).length
  const losses = trades.filter((t: { pnl?: number }) => (t.pnl ?? 0) < 0).length

  const tradesText = trades.map((t: {
    entry_time: string; symbol: string; direction: string; size: number; pnl?: number
  }) =>
    `${new Date(t.entry_time).toTimeString().slice(0, 5)} ${t.symbol} ${t.direction} size=${t.size} pnl=${t.pnl != null ? (t.pnl >= 0 ? '+' : '') + t.pnl.toFixed(2) : '?'}€`
  ).join('\n')

  const alertsText = alerts?.length
    ? alerts.map((a: { level: number; type: string; message: string }) =>
        `- Niveau ${a.level} ${a.type}: ${a.message}`
      ).join('\n')
    : 'Aucune alerte'

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 450,
    system: `Tu es Caldra, un coach de trading comportemental. Tu analyses les sessions et fournis des debriefings précis, honnêtes et constructifs. Tu te concentres sur les comportements, pas uniquement sur les résultats financiers. Tes réponses sont en français, concises et actionnables.`,
    messages: [{
      role: 'user',
      content: `Debrief de ma session du ${date}.

Résultats : ${trades.length} trades, PnL ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}€, ${wins}W / ${losses}L

Détail des trades :
${tradesText}

Alertes Caldra déclenchées :
${alertsText}

Génère un debrief structuré en 3 parties courtes :
1. **Ce qui s'est passé** — comportements observés (pas juste le PnL)
2. **Pattern dominant** — le thème central de cette session
3. **Demain** — un point précis et concret à travailler`,
    }],
  })

  const debrief = (msg.content[0] as { type: string; text: string }).text

  return NextResponse.json({ date, debrief })
}
