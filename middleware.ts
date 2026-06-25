import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/pricing', '/support', '/mentions-legales', '/confidentialite', '/auth/callback', '/api/billing/webhook', '/api/waitlist', '/forgot-password', '/reset-password']

// ── Rate limiting in-memory (par IP) ─────────────────────────────────────────
// Limites : /api/ingest 60 req/min | /api/waitlist 5 req/min | /api/api-key 10 req/min
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/ingest':   { max: 60,  windowMs: 60_000 },
  '/api/waitlist': { max: 5,   windowMs: 60_000 },
  '/api/api-key':  { max: 10,  windowMs: 60_000 },
}
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rate limiting sur les endpoints sensibles
  const limit = RATE_LIMITS[pathname]
  if (limit) {
    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-real-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown'
    const key = `${pathname}:${ip}`
    if (!checkRateLimit(key, limit.max, limit.windowMs)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  // Toutes les routes /api/ gèrent leur propre auth — jamais de redirection middleware
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // NE PAS supprimer cet appel — il rafraîchit la session et met à jour les cookies
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const isPublic = PUBLIC_ROUTES.includes(path) || path.startsWith('/auth/')

  // Route protégée sans session → login
  if (!isPublic && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  // Sur /login ou /signup avec session active → dashboard
  if ((path === '/login' || path === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── Gate "essai gated CB" ───────────────────────────────────────────────────
  // User connecté mais sans abonnement actif/en essai → renvoyé au checkout.
  // /billing (page résultat succès/annulé) reste accessible pour ne pas casser
  // le retour de Stripe pendant que le webhook met à jour le statut.
  if (user && !isPublic && path !== '/billing') {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_status')
      .eq('user_id', user.id)
      .maybeSingle()

    const status = profile?.subscription_status
    const entitled = status === 'trialing' || status === 'active' || status === 'past_due'
    if (!entitled) {
      const plan = (user.user_metadata as { plan?: string } | undefined)?.plan
      const checkoutUrl = new URL('/api/billing/checkout', request.url)
      if (plan === 'pro' || plan === 'max' || plan === 'sentinel') {
        checkoutUrl.searchParams.set('plan', plan)
      }
      return NextResponse.redirect(checkoutUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  // Inclut les routes /api/ pour que le rate limiting s'applique.
  // L'auth guard est court-circuité plus haut pour /api/ (return NextResponse.next()).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
