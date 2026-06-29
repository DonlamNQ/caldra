export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'
import { encryptSecret } from '@/lib/secretCrypto'

const service = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Connexion Interactive Brokers via Flex Web Service : l'utilisateur fournit son token Flex
// (lecture seule) + l'ID de sa requête « Trade Confirms ». On chiffre le token et on crée
// une clé d'ingest dédiée ; le worker IBKR interroge ensuite IBKR et poste les trades.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const token   = String(body.token ?? '').trim()
  const queryId = String(body.queryId ?? '').trim()

  if (!token || !queryId) {
    return NextResponse.json({ error: 'Le token Flex et l\'ID de requête sont requis.' }, { status: 400 })
  }
  // Le token Flex est une longue chaîne numérique ; l'ID de requête aussi (court).
  if (!/^[0-9]{6,40}$/.test(token)) {
    return NextResponse.json({ error: 'Token Flex invalide (longue suite de chiffres).' }, { status: 400 })
  }
  if (!/^[0-9]{4,15}$/.test(queryId)) {
    return NextResponse.json({ error: 'ID de requête Flex invalide.' }, { status: 400 })
  }

  let tokenEnc: string
  try { tokenEnc = encryptSecret(token) }
  catch { return NextResponse.json({ error: 'Chiffrement indisponible (MT5_ENC_KEY).' }, { status: 500 }) }

  const db = service()

  // Clé d'ingest dédiée à cette connexion IBKR.
  const plain     = `cal_${randomBytes(20).toString('hex')}`
  const keyHash   = createHash('sha256').update(plain).digest('hex')
  const keyPrefix = `${plain.slice(0, 12)}...`

  await db.from('api_keys').delete().eq('user_id', user.id).eq('label', 'IBKR-Flex')
  await db.from('api_keys').insert({
    user_id: user.id, key_hash: keyHash, key_prefix: keyPrefix, label: 'IBKR-Flex',
  })

  // Une seule connexion IBKR par user → on remplace.
  await db.from('ibkr_accounts').delete().eq('user_id', user.id)
  const { error } = await db.from('ibkr_accounts').insert({
    user_id:        user.id,
    flex_token_enc: tokenEnc,
    flex_query_id:  queryId,
    ingest_key:     plain,
    status:         null,   // le worker le passe à 'connected' / 'auth_failed'
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
