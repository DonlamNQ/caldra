import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Clé API Anthropic non configurée' }, { status: 503 })
  }

  const { messages, context } = await req.json()

  const systemPrompt = `Tu es Sentinel, le coach IA de trading de Caldra. Tu analyses le comportement des traders en temps réel.

Contexte de session actuel :
- Score comportemental : ${context.score}/100
- P&L session : ${context.pnl > 0 ? '+' : ''}${context.pnl.toFixed(2)} USD
- Trades aujourd'hui : ${context.totalTrades}
- Alertes actives : ${context.alertCount}
- Patterns détectés : ${context.alertTypes?.join(', ') || 'aucun'}

Règles du trader :
- Drawdown max : ${context.rules?.max_daily_drawdown_pct ?? 3}%
- Max trades/session : ${context.rules?.max_trades_per_session ?? 10}
- Pertes consécutives max : ${context.rules?.max_consecutive_losses ?? 3}
- Fenêtre : ${context.rules?.session_start ?? '09:30'}–${context.rules?.session_end ?? '16:00'}

Instructions :
- Réponds en 1 à 3 phrases maximum, en français
- Sois direct et bienveillant, focus sur le comportement
- Si le trader prend des risques excessifs, sois ferme
- Ne fais jamais de prédictions de marché`

  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ content: text })
}
