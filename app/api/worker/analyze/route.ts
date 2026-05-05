export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { analyzeTradeForAlerts } from '@/lib/engine'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-worker-secret')
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const trade = await req.json()
  if (!trade?.id || !trade?.user_id) {
    return NextResponse.json({ error: 'Invalid trade payload' }, { status: 400 })
  }

  try {
    await analyzeTradeForAlerts(trade)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[worker/analyze] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
