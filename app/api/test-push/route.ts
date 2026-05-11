import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const USER_ID = '95d4d4da-9e11-4c66-8540-fbba0a8e27b1'

export async function GET() {
  const results: Record<string, unknown> = {}

  // Check env vars
  results.vapid_public = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  results.vapid_private = !!process.env.VAPID_PRIVATE_KEY
  results.vapid_email = process.env.VAPID_EMAIL || null

  if (!process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'VAPID_PRIVATE_KEY missing', results })
  }

  try {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL || 'contact@getcaldra.com'}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY
    )
    results.vapid_init = 'ok'
  } catch (e) {
    return NextResponse.json({ error: 'VAPID init failed', detail: String(e), results })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subs, error: dbErr } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', USER_ID)

  results.db_error = dbErr?.message || null
  results.subs_count = subs?.length ?? 0
  results.endpoints = subs?.map(s => new URL(s.endpoint).hostname) ?? []

  if (!subs?.length) {
    return NextResponse.json({ error: 'no subscriptions found', results })
  }

  const payload = JSON.stringify({ title: 'Caldra — Test push', body: 'Vérification du système de notifications', level: 2, url: '/dashboard' })

  const pushResults = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 3600 }
      )
    )
  )

  results.push_results = pushResults.map((r, i) => ({
    endpoint: new URL(subs[i].endpoint).hostname,
    status: r.status,
    ...(r.status === 'rejected' ? { error: String(r.reason) } : { statusCode: (r.value as { statusCode?: number })?.statusCode }),
  }))

  return NextResponse.json(results)
}
