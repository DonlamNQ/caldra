import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { TradovateClient } from '@/lib/tradovate/client'
import { tradovateManager } from '@/lib/tradovate/manager'
import { encryptPassword } from '@/lib/tradovate/crypto'

export async function POST(req: NextRequest) {
  // Auth Caldra
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const body = await req.json()
  const { username, password, apiKey, caldraApiKey, isDemo } = body as {
    username: string
    password: string
    apiKey: string
    caldraApiKey: string
    isDemo: boolean
  }

  if (!username || !password || !apiKey || !caldraApiKey) {
    return NextResponse.json({ error: 'Champs manquants : username, password, apiKey, caldraApiKey' }, { status: 400 })
  }

  // Vérifier que la clé Caldra fournie est valide (hash SHA-256 → api_keys)
  const { createHash } = await import('crypto')
  const keyHash = createHash('sha256').update(caldraApiKey).digest('hex')
  const { data: apiKeyRow } = await service
    .from('api_keys')
    .select('user_id')
    .eq('key_hash', keyHash)
    .eq('user_id', user.id)
    .single()

  if (!apiKeyRow) {
    return NextResponse.json({ error: 'Clé API Caldra invalide — génère-la depuis Settings → API' }, { status: 400 })
  }

  // Authentifier sur Tradovate
  let accessToken: string
  let accountId: number | null

  try {
    const tempClient = new TradovateClient(
      user.id,
      isDemo ?? true,
      caldraApiKey,
      service as any,
    )
    const result = await tempClient.authenticate(username, password, apiKey)
    accessToken = result.accessToken
    accountId   = result.accountId
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Tradovate][connect] Auth échouée pour user=${user.id}:`, msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Persister en base (upsert)
  const { error: dbErr } = await service
    .from('tradovate_connections')
    .upsert({
      user_id:                   user.id,
      tradovate_username:        username,
      tradovate_password_hash:   encryptPassword(password),
      tradovate_api_key:         apiKey,
      caldra_api_key_enc:        encryptPassword(caldraApiKey),
      account_id:                accountId,
      access_token:              accessToken,
      is_demo:                   isDemo ?? true,
      is_active:                 true,
      last_sync_at:              null,
    }, { onConflict: 'user_id' })

  if (dbErr) {
    console.error(`[Tradovate][connect] DB error:`, dbErr)
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  // Démarrer le WebSocket (singleton manager)
  tradovateManager.start(user.id, accessToken, isDemo ?? true, caldraApiKey)

  console.log(`[Tradovate][connect] user=${user.id} connecté — account_id=${accountId} env=${isDemo ? 'DEMO' : 'LIVE'}`)

  return NextResponse.json({ success: true, accountId, isDemo: isDemo ?? true })
}
