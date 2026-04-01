import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'crypto'

async function getUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(s) { try { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
  return supabase.auth.getUser()
}

const service = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — clé courante (masquée)
export async function GET() {
  const { data: { user } } = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await service()
    .from('api_keys')
    .select('key_prefix, created_at')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json(data ?? null)
}

// POST — génère une nouvelle clé (retourne la clé en clair UNE SEULE FOIS)
export async function POST() {
  const { data: { user } } = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawKey = `cal_${randomBytes(24).toString('hex')}`
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 14)

  await service()
    .from('api_keys')
    .delete()
    .eq('user_id', user.id)

  await service()
    .from('api_keys')
    .insert({ user_id: user.id, key_hash: keyHash, key_prefix: keyPrefix })

  return NextResponse.json({ key: rawKey, key_prefix: keyPrefix })
}

// DELETE — révoque la clé
export async function DELETE() {
  const { data: { user } } = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await service().from('api_keys').delete().eq('user_id', user.id)
  return NextResponse.json({ success: true })
}
