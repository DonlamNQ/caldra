export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { analyzeTradeForAlerts } from '@/lib/engine'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-caldra-key',
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS })
}

export async function GET(req: NextRequest) {
  return POST(req)
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Clé API : header ou query param (MT5 perd les headers sur redirect)
  const rawKey = req.headers.get('x-caldra-key') ?? req.nextUrl.searchParams.get('key')
  if (!rawKey) {
    return NextResponse.json({ error: 'Missing x-caldra-key header' }, { status: 401, headers: CORS_HEADERS })
  }

  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('user_id')
    .eq('key_hash', keyHash)
    .single()

  if (!apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: CORS_HEADERS })
  }

  const user_id = apiKey.user_id

  // Body JSON ou query params (fallback MT5 GET)
  const q = req.nextUrl.searchParams
  let symbol, direction, size, entry_price, exit_price, entry_time, exit_time, pnl
  if (q.get('symbol')) {
    symbol      = q.get('symbol')
    direction   = q.get('direction')
    size        = parseFloat(q.get('size') ?? '0')
    entry_price = parseFloat(q.get('entry_price') ?? '0')
    exit_price  = parseFloat(q.get('exit_price') ?? '0') || undefined
    entry_time  = q.get('entry_time')
    exit_time   = q.get('exit_time') ?? undefined
    pnl         = q.get('pnl') != null ? parseFloat(q.get('pnl')!) : undefined
  } else {
    try {
      const body = await req.json()
      ;({ symbol, direction, size, entry_price, exit_price, entry_time, exit_time, pnl } = body)
    } catch {
      return NextResponse.json({ error: 'Invalid or empty body' }, { status: 400, headers: CORS_HEADERS })
    }
  }

  // Validation basique
  if (!symbol || !direction || !size || !entry_price || !entry_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: CORS_HEADERS })
  }

  // Ignorer les positions encore ouvertes (pas d'exit_price = trade non clôturé)
  if (!exit_price || pnl == null) {
    return NextResponse.json({ ignored: true, reason: 'Position still open — no exit_price or pnl' }, { status: 200, headers: CORS_HEADERS })
  }

  // Sauvegarde le trade
  const { data: trade, error } = await supabase
    .from('trades')
    .insert({
      user_id,
      symbol,
      direction,
      size,
      entry_price,
      exit_price,
      entry_time,
      exit_time,
      pnl,
      status: exit_time ? 'closed' : 'open'
    })
    .select()
    .single()

if (error) {
    console.error('SUPABASE ERROR:', error)
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS })
  }

  // Lance l'analyse comportementale
  const alerts = await analyzeTradeForAlerts(trade)

  return NextResponse.json({
    success: true,
    trade_id: trade.id,
    alerts_generated: alerts.length,
    alerts
  }, { headers: CORS_HEADERS })
}