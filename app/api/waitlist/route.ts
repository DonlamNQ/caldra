import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}))
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: true })
  }

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.toLowerCase().trim(), updateEnabled: true }),
  })

  if (!res.ok && res.status !== 204) {
    return NextResponse.json({ error: 'Brevo error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
