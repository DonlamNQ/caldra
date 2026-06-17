import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

// Per-user rate limit: 10 req/min
const userRateStore = new Map<string, { count: number; resetAt: number }>()

function checkUserLimit(userId: string): boolean {
  const now = Date.now()
  const entry = userRateStore.get(userId)
  if (!entry || now > entry.resetAt) {
    userRateStore.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!UUID_RE.test(user.id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!checkUserLimit(user.id)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Clé API Anthropic non configurée' }, { status: 503 })
  }

  let messages: unknown, context: unknown
  try {
    const body = await req.json()
    messages = body.messages
    context = body.context
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
  }
  for (const m of messages) {
    if (typeof m !== 'object' || m === null) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }
    const msg = m as { role: unknown; content: unknown }
    if (!['user', 'assistant'].includes(msg.role as string)) {
      return NextResponse.json({ error: 'Invalid message role' }, { status: 400 })
    }
    if (typeof msg.content !== 'string' || msg.content.length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 chars)' }, { status: 400 })
    }
  }

  // Sanitize context — never trust client values interpolated into system prompt
  const ctx = (context && typeof context === 'object') ? context as Record<string, unknown> : {}
  const score       = typeof ctx.score === 'number'       ? Math.min(100, Math.max(0, Math.round(ctx.score)))       : 0
  const pnl         = typeof ctx.pnl === 'number' && isFinite(ctx.pnl) ? ctx.pnl : 0
  const totalTrades = typeof ctx.totalTrades === 'number'  ? Math.max(0, Math.floor(ctx.totalTrades))                : 0
  const alertCount  = typeof ctx.alertCount === 'number'   ? Math.max(0, Math.floor(ctx.alertCount))                 : 0
  const alertTypes  = Array.isArray(ctx.alertTypes)
    ? (ctx.alertTypes as unknown[]).filter(t => typeof t === 'string' && /^[a-z_]+$/.test(t as string)).slice(0, 10)
    : []
  const rules = (ctx.rules && typeof ctx.rules === 'object') ? ctx.rules as Record<string, unknown> : {}
  const drawdownPct   = typeof rules.max_daily_drawdown_pct  === 'number' ? rules.max_daily_drawdown_pct  : 3
  const maxTrades     = typeof rules.max_trades_per_session  === 'number' ? rules.max_trades_per_session  : 10
  const maxLosses     = typeof rules.max_consecutive_losses  === 'number' ? rules.max_consecutive_losses  : 3
  const sessionStart  = typeof rules.session_start === 'string' ? rules.session_start.replace(/[^0-9:]/g, '').slice(0, 5) : '09:30'
  const sessionEnd    = typeof rules.session_end   === 'string' ? rules.session_end.replace(/[^0-9:]/g, '').slice(0, 5)   : '16:00'

  const systemPrompt = `Tu es Sentinel, le coach IA de trading de Caldra. Tu analyses le comportement des traders en temps réel.

Contexte de session actuel :
- Score comportemental : ${score}/100
- P&L session : ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)} USD
- Trades aujourd'hui : ${totalTrades}
- Alertes actives : ${alertCount}
- Patterns détectés : ${alertTypes.join(', ') || 'aucun'}

Règles du trader :
- Drawdown max : ${drawdownPct}%
- Max trades/session : ${maxTrades}
- Pertes consécutives max : ${maxLosses}
- Fenêtre : ${sessionStart}–${sessionEnd}

Instructions :
- Réponds en 1 à 3 phrases maximum, en français
- Sois direct et bienveillant, focus sur le comportement
- Si le trader prend des risques excessifs, sois ferme
- Ne fais jamais de prédictions de marché`

  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: systemPrompt,
    messages: (messages as Array<{ role: string; content: string }>).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ content: text })
}
