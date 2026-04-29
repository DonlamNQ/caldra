import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

  const PRICE_TO_PLAN: Record<string, 'pro' | 'sentinel'> = {
    [process.env.STRIPE_PRO_PRICE_ID!]:      'pro',
    [process.env.STRIPE_SENTINEL_PRICE_ID!]: 'sentinel',
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const plan = session.metadata?.plan as 'pro' | 'sentinel' | undefined

    if (userId && plan) {
      await service
        .from('user_profiles')
        .upsert(
          {
            user_id: userId,
            plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          },
          { onConflict: 'user_id' }
        )
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const priceId = sub.items.data[0]?.price.id
    const plan = PRICE_TO_PLAN[priceId] ?? 'pro'

    const { data: profile } = await service
      .from('user_profiles')
      .select('user_id')
      .eq('stripe_customer_id', sub.customer as string)
      .single()

    if (profile) {
      await service
        .from('user_profiles')
        .update({ plan, stripe_subscription_id: sub.id })
        .eq('user_id', profile.user_id)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription

    const { data: profile } = await service
      .from('user_profiles')
      .select('user_id')
      .eq('stripe_customer_id', sub.customer as string)
      .single()

    if (profile) {
      await service
        .from('user_profiles')
        .update({ plan: 'pro', stripe_subscription_id: null })
        .eq('user_id', profile.user_id)
    }
  }

  return NextResponse.json({ received: true })
}
