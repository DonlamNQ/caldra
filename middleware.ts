import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/pricing', '/support', '/mentions-legales', '/confidentialite', '/auth/callback', '/api/ctrader/callback', '/api/ctrader/connect']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

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

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
