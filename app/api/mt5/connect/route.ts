export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'
import { encryptMt5Password } from '@/lib/mt5crypto'

const service = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const login    = String(body.login ?? '').trim()
  const server   = String(body.server ?? '').trim()
  const password = String(body.password ?? '')

  if (!login || !server || !password) {
    return NextResponse.json({ error: 'login, server et password sont requis' }, { status: 400 })
  }
  if (!/^[0-9]{3,20}$/.test(login)) {
    return NextResponse.json({ error: 'Numéro de compte invalide' }, { status: 400 })
  }

  let passwordEnc: string
  try { passwordEnc = encryptMt5Password(password) }
  catch { return NextResponse.json({ error: 'Chiffrement indisponible (MT5_ENC_KEY)' }, { status: 500 }) }

  const db = service()

  // Clé d'ingest dédiée à cette connexion MT5-API.
  const plain     = `cal_${randomBytes(20).toString('hex')}`
  const keyHash   = createHash('sha256').update(plain).digest('hex')
  const keyPrefix = `${plain.slice(0, 12)}...`

  await db.from('api_keys').delete().eq('user_id', user.id).eq('label', 'MT5-API')
  await db.from('api_keys').insert({
    user_id: user.id, key_hash: keyHash, key_prefix: keyPrefix, label: 'MT5-API',
  })

  // Une seule connexion MT5 par user → on remplace.
  await db.from('mt5_accounts').delete().eq('user_id', user.id)
  const { error } = await db.from('mt5_accounts').insert({
    user_id:      user.id,
    mt5_login:    login,
    mt5_server:   server,
    password_enc: passwordEnc,
    ingest_key:   plain,
    status:       null,   // le worker le passe à 'connected' / 'auth_failed'
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
