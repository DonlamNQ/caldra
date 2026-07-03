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

// Connexion Binance via clé API en LECTURE SEULE. L'utilisateur crée une clé API sans droit
// de trading ni de retrait, la colle ici avec son secret. On chiffre les deux (AES-256-GCM) et
// on crée une clé d'ingest dédiée ; le worker Binance signe ensuite les requêtes (HMAC-SHA256),
// lit les trades et les poste vers /api/ingest. Le user_id n'est jamais dans le body (sécurité).
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const apiKey    = String(body.apiKey ?? '').trim()
  const apiSecret = String(body.apiSecret ?? '').trim()
  const symbols   = String(body.symbols ?? '').trim().toUpperCase().replace(/\s+/g, '')

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'La clé API et le secret sont requis.' }, { status: 400 })
  }
  if (!/^[A-Za-z0-9]{16,128}$/.test(apiKey) || !/^[A-Za-z0-9]{16,128}$/.test(apiSecret)) {
    return NextResponse.json({ error: 'Clé API ou secret au format invalide (copie-les sans espace).' }, { status: 400 })
  }
  if (symbols && !/^[A-Z0-9]{4,20}(,[A-Z0-9]{4,20})*$/.test(symbols)) {
    return NextResponse.json({ error: 'Symboles invalides. Format attendu : BTCUSDT,ETHUSDT.' }, { status: 400 })
  }

  let apiKeyEnc: string, apiSecretEnc: string
  try {
    apiKeyEnc = encryptSecret(apiKey)
    apiSecretEnc = encryptSecret(apiSecret)
  } catch {
    return NextResponse.json({ error: 'Chiffrement indisponible (MT5_ENC_KEY).' }, { status: 500 })
  }

  const db = service()

  // Clé d'ingest dédiée à cette connexion Binance.
  const plain     = `cal_${randomBytes(20).toString('hex')}`
  const keyHash   = createHash('sha256').update(plain).digest('hex')
  const keyPrefix = `${plain.slice(0, 12)}...`

  await db.from('api_keys').delete().eq('user_id', user.id).eq('label', 'Binance')
  await db.from('api_keys').insert({
    user_id: user.id, key_hash: keyHash, key_prefix: keyPrefix, label: 'Binance',
  })

  // Une seule connexion Binance par user → on remplace.
  await db.from('binance_accounts').delete().eq('user_id', user.id)
  const { error } = await db.from('binance_accounts').insert({
    user_id:        user.id,
    api_key_enc:    apiKeyEnc,
    api_secret_enc: apiSecretEnc,
    symbols:        symbols || null,
    ingest_key:     plain,
    status:         null,   // le worker le passe à 'connected' / 'auth_failed'
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
