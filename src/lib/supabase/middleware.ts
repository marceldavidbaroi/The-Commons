import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Validate user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public paths accessible without authentication:
  // - Root landing page ('/')
  // - Login portal ('/login')
  // - Auth callbacks ('/auth/*')
  // - OAuth consent ('/oauth/*')
  // - Design system / developer preview ('/dev/*')
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/oauth') ||
    pathname.startsWith('/dev')

  // 1. Authenticated user accessing landing page or login -> redirect straight to /home
  if (user) {
    if (pathname === '/' || pathname.startsWith('/login')) {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/home'
      return NextResponse.redirect(homeUrl)
    }
  }

  // 2. Unauthenticated user attempting to access protected feature routes (/home, /my-diaries, etc.)
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
