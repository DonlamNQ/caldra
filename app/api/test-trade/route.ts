import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { analyzeTradeForAlerts } from '@/lib/engine'

const SYMBOLS = ['ES', 'NQ', 'MNQ', 'MES', 'CL', 'GC', 'EUR/USD', 'GBP/USD']
const DIRECTIONS = ['long', 'short'] as const

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const symbol    = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
  const direction = DIRECTIONS[Math.floor(Math.random() * 2)]
  const size      = +(1 + Math.random() * 3).toFixed(1)
  const entryPrice = +(5200 + Math.random() * 100).toFixed(2)
  const pnl       = +((Math.random() - 0.55) * 400).toFixed(2)
  const exitPrice = +(entryPrice + (direction === 'long' ? pnl / size : -pnl / size)).toFixed(2)
  const now       = new Date()
  const entryTime = new Date(now.getTime() - 15 * 60000).toISOString()
  const exitTime  = now.toISOString()

  const { data: trade, error } = await service
    .from('trades')
    .insert({
      user_id: user.id,
      symbol, direction, size,
      entry_price: entryPrice,
      exit_price: exitPrice,
      pnl,
      entry_time: entryTime,
      exit_time: exitTime,
    })
    .select()
    .single()

  if (error || !trade) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })
  }

  await analyzeTradeForAlerts(trade)

  return NextResponse.json({ ok: true, trade: { symbol, direction, size, pnl } })
}
