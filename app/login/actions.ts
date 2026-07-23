'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export async function loginAction(
  formData: FormData
): Promise<{ error: string; needsConfirmation?: boolean } | void> {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string
  const next     = (formData.get('next')    as string) || ''

  if (!email || !password) {
    return { error: 'Email et mot de passe requis' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Email jamais confirmé : cas le plus fréquent de « je n'arrive pas à me
    // connecter ». On le signale explicitement pour que l'UI propose le renvoi.
    if (error.code === 'email_not_confirmed' || error.message === 'Email not confirmed') {
      return {
        error: "Ton adresse email n'a pas encore été confirmée. Vérifie ta boîte de réception (et tes spams), ou renvoie le lien de confirmation ci-dessous.",
        needsConfirmation: true,
      }
    }
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

// Renvoie un email de confirmation à un compte non encore vérifié.
// Réponse volontairement neutre (pas de fuite sur l'existence du compte).
export async function resendConfirmationAction(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Email invalide' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`,
    },
  })

  // « already confirmed » ou email inexistant : on ne le divulgue pas.
  if (error && error.code !== 'over_email_send_rate_limit') {
    return { ok: true }
  }
  if (error) {
    return { ok: false, error: 'Trop de tentatives. Réessaie dans quelques minutes.' }
  }
  return { ok: true }
}
