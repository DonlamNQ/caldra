export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { analyzeTradeForAlerts } from '@/lib/engine'
import webpush from 'web-push'

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

  // Validation stricte des champs
  if (!symbol || !direction || !size || !entry_price || !entry_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: CORS_HEADERS })
  }
  if (!/^[A-Za-z0-9./_-]{1,20}$/.test(String(symbol))) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400, headers: CORS_HEADERS })
  }
  if (!['long', 'short'].includes(String(direction))) {
    return NextResponse.json({ error: 'direction must be long or short' }, { status: 400, headers: CORS_HEADERS })
  }
  if (typeof size !== 'number' || !isFinite(size) || size <= 0 || size > 100000) {
    return NextResponse.json({ error: 'Invalid size' }, { status: 400, headers: CORS_HEADERS })
  }
  if (typeof entry_price !== 'number' || !isFinite(entry_price) || entry_price <= 0) {
    return NextResponse.json({ error: 'Invalid entry_price' }, { status: 400, headers: CORS_HEADERS })
  }
  if (exit_price !== undefined && (typeof exit_price !== 'number' || !isFinite(exit_price) || exit_price <= 0)) {
    return NextResponse.json({ error: 'Invalid exit_price' }, { status: 400, headers: CORS_HEADERS })
  }
  if (pnl !== undefined && (typeof pnl !== 'number' || !isFinite(pnl) || Math.abs(pnl) > 10_000_000)) {
    return NextResponse.json({ error: 'Invalid pnl' }, { status: 400, headers: CORS_HEADERS })
  }
  const entryTs = new Date(entry_time as string).getTime()
  if (isNaN(entryTs)) {
    return NextResponse.json({ error: 'Invalid entry_time' }, { status: 400, headers: CORS_HEADERS })
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

  // Envoie les web push pour chaque alerte
  if (alerts.length > 0) {
    const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const vapidEmail   = process.env.VAPID_EMAIL ?? 'contact@getcaldra.com'

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublic, vapidPrivate)

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', user_id)

      if (subs && subs.length > 0) {
        for (const alert of alerts) {
          const payload = JSON.stringify({
            title: `Caldra — ${(alert.type ?? '').replace(/_/g, ' ').toUpperCase()}`,
            body: alert.message ?? '',
            url: '/dashboard',
            level: alert.level ?? 1,
          })
          for (const sub of subs) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload
              )
              console.log('[push] sent to', sub.endpoint.slice(0, 50))
            } catch (e: any) {
              console.error('[push] error', e.statusCode, e.message, sub.endpoint.slice(0, 50))
              if (e.statusCode === 410 || e.statusCode === 404 || (e.statusCode === 400 && sub.endpoint.includes('apple.com'))) {
                await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
                console.log('[push] removed stale sub', sub.endpoint.slice(0, 50))
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    trade_id: trade.id,
    alerts_generated: alerts.length,
    alerts
  }, { headers: CORS_HEADERS })
}