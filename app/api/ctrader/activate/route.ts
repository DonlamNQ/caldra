import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { caldraApiKey } = await req.json() as { caldraApiKey: string }
  if (!caldraApiKey?.startsWith('cal_')) {
    return NextResponse.json({ error: 'Clé API Caldra invalide (doit commencer par cal_)' }, { status: 400 })
  }

  // Vérifie que la clé appartient bien à cet user
  const keyHash = createHash('sha256').update(caldraApiKey).digest('hex')
  const { data: apiKeyRow } = await service
    .from('api_keys')
    .select('user_id')
    .eq('key_hash', keyHash)
    .eq('user_id', user.id)
    .single()

  if (!apiKeyRow) {
    return NextResponse.json({ error: 'Clé API Caldra invalide ou non trouvée' }, { status: 400 })
  }

  // Vérifie qu'une connexion cTrader existe
  const { data: conn } = await service
    .from('ctrader_connections')
    .select('account_id, account_name')
    .eq('user_id', user.id)
    .single()

  if (!conn) {
    return NextResponse.json({ error: 'Aucune connexion cTrader — connecte cTrader en premier' }, { status: 400 })
  }

  // Stocke la caldra_api_key et active la connexion
  const { error: updateErr } = await service
    .from('ctrader_connections')
    .update({ caldra_api_key: caldraApiKey, is_active: true })
    .eq('user_id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  console.log(`[cTrader][activate] Connexion activée — user=${user.id} account=${conn.account_id}`)
  return NextResponse.json({ success: true, accountName: conn.account_name })
}
