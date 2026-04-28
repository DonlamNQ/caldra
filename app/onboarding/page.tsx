import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import OnboardingWizard from './OnboardingWizard'

export default async function OnboardingPage({ searchParams }: { searchParams: { preview?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/onboarding')

  if (!searchParams.preview) {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: rules } = await service
      .from('trading_rules')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (rules) redirect('/dashboard')
  }

  return <OnboardingWizard userEmail={user.email ?? ''} />
}
