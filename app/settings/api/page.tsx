import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import ApiKeyClient from './ApiKeyClient'

export default async function ApiSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/settings/api')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: apiKey } = await service
    .from('api_keys')
    .select('key_prefix, created_at')
    .eq('user_id', user.id)
    .single()

  return (
    <ApiKeyClient
      userEmail={user.email ?? ''}
      existingPrefix={apiKey?.key_prefix ?? null}
      existingCreatedAt={apiKey?.created_at ?? null}
    />
  )
}
