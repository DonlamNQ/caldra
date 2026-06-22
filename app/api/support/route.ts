import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendSupportMessage } from '@/lib/brevo'

export const dynamic = 'force-dynamic'

// Per-user rate limit: 5 messages / 10 min
const rateStore = new Map<string, { count: number; resetAt: number }>()

function checkLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateStore.get(userId)
  if (!entry || now > entry.resetAt) {
    rateStore.set(userId, { count: 1, resetAt: now + 600_000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!checkLimit(user.id)) {
    return NextResponse.json({ error: 'Trop de messages — réessaie plus tard.' }, { status: 429 })
  }

  let body: { subject?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const message = (body.message ?? '').trim()
  const subject = (body.subject ?? '').trim()
  if (!message) return NextResponse.json({ error: 'Le message est vide.' }, { status: 400 })
  if (message.length > 5000) return NextResponse.json({ error: 'Message trop long.' }, { status: 400 })

  // Récupère le plan pour donner du contexte au support (best-effort)
  let plan: string | undefined
  try {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await service.from('user_profiles').select('plan').eq('user_id', user.id).single()
    plan = profile?.plan ?? undefined
  } catch { /* contexte optionnel */ }

  const meta = user.user_metadata ?? {}
  const fromName = (meta.full_name || `${meta.first_name ?? ''} ${meta.last_name ?? ''}`.trim() || undefined) as string | undefined

  const sent = await sendSupportMessage({
    fromEmail: user.email ?? '',
    fromName,
    subject,
    message,
    plan,
  })

  if (!sent) {
    return NextResponse.json(
      { error: "Envoi impossible pour le moment. Écris-nous à contact@getcaldra.com." },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
