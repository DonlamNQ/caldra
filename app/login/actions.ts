'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export async function loginAction(
  formData: FormData
): Promise<{ error: string } | void> {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string
  const next     = (formData.get('next')    as string) || ''

  if (!email || !password) {
    return { error: 'Email et mot de passe requis' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return {
      error: error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect'
        : error.message,
    }
  }

  // Destination explicite passée en paramètre (ex: ?next=/settings/api)
  if (next && next.startsWith('/') && next !== '/login') {
    redirect(next)
  }

  // Premier login : pas encore de règles → onboarding
  // Logins suivants : règles présentes → dashboard
  const userId = data.user?.id
  if (userId) {
    try {
      const service = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: rules } = await service
        .from('trading_rules')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      redirect(rules ? '/dashboard' : '/onboarding')
    } catch {
      redirect('/dashboard')
    }
  }

  redirect('/dashboard')
}
