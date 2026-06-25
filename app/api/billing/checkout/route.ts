import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { cookies } from 'next/headers'

function stripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
}

function priceIds(): Record<string, string> {
  return {
    pro: process.env.STRIPE_PRO_PRICE_ID!,
    max: (process.env.STRIPE_MAX_PRICE_ID ?? process.env.STRIPE_SENTINEL_PRICE_ID ?? process.env.STRIPE_TEAM_PRICE_ID)!,
  }
}

// price ID Stripe → plan Caldra (pour reconnaître un abonnement existant)
function planForPrice(priceId: string | undefined): 'pro' | 'max' | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === (process.env.STRIPE_MAX_PRICE_ID ?? process.env.STRIPE_SENTINEL_PRICE_ID)) return 'max'
  return null
}

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

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Récupère (ou crée) le customer Stripe lié au user, et le mémorise en base.
async function ensureCustomer(stripe: Stripe, service: ReturnType<typeof serviceClient>, userId: string, email: string | undefined) {
  const { data: profile } = await service
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { user_id: userId } })
    customerId = customer.id
    await service
      .from('user_profiles')
      .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' })
  }
  return customerId as string
}

function normalizePlan(raw: unknown): 'pro' | 'max' | null {
  const p = raw === 'sentinel' ? 'max' : raw
  return p === 'pro' || p === 'max' ? p : null
}

// ── POST : appelé en fetch depuis le dashboard (upgrade/changement de plan) ──────
// Retourne { url } pour redirection côté client.
export async function POST(req: NextRequest) {
  const stripe = stripeClient()
  const { data: { user } } = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan: rawPlan } = await req.json()
  const plan = normalizePlan(rawPlan)
  if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  const priceId = priceIds()[plan]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const service = serviceClient()
  const customerId = await ensureCustomer(stripe, service, user.id, user.email ?? undefined)
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 7 },
    payment_method_collection: 'always',
    allow_promotion_codes: true,
    success_url: `${origin}/billing?success=1`,
    cancel_url: `${origin}/billing?canceled=1`,
    metadata: { user_id: user.id, plan },
  })

  return NextResponse.json({ url: session.url })
}

// ── GET : démarrage d'essai gated CB (parcours signup) ──────────────────────────
// Redirige vers Stripe Checkout. Idempotent : si un abonnement actif/en essai
// existe déjà côté Stripe, on synchronise la base et on renvoie dans l'app
// (évite de créer un second essai et la boucle de redirection avec le gate).
export async function GET(req: NextRequest) {
  const stripe = stripeClient()
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

  const { data: { user } } = await getUser()
  if (!user) return NextResponse.redirect(`${origin}/login?next=/dashboard`)

  // plan : query (?plan=) en priorité, sinon métadonnée du signup, défaut 'pro'
  const queryPlan = normalizePlan(new URL(req.url).searchParams.get('plan'))
  const metaPlan  = normalizePlan((user.user_metadata as { plan?: string } | undefined)?.plan)
  const plan = queryPlan ?? metaPlan ?? 'pro'
  const priceId = priceIds()[plan]
  if (!priceId) return NextResponse.redirect(`${origin}/pricing`)

  const service = serviceClient()
  const customerId = await ensureCustomer(stripe, service, user.id, user.email ?? undefined)

  // Abonnement déjà actif/en essai ? → on synchronise et on entre dans l'app.
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })
  const live = subs.data.find(s => s.status === 'trialing' || s.status === 'active' || s.status === 'past_due')
  if (live) {
    const livePlan = planForPrice(live.items.data[0]?.price.id) ?? plan
    await service
      .from('user_profiles')
      .upsert(
        { user_id: user.id, plan: livePlan, subscription_status: live.status, stripe_customer_id: customerId, stripe_subscription_id: live.id },
        { onConflict: 'user_id' }
      )
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 7 },
    payment_method_collection: 'always',
    allow_promotion_codes: true,
    success_url: `${origin}/billing?success=1`,
    cancel_url: `${origin}/pricing?canceled=1`,
    metadata: { user_id: user.id, plan },
  })

  return NextResponse.redirect(session.url!)
}
