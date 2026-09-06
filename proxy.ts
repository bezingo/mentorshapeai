import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

/**
 * Route protection (Next.js 16 `proxy.ts`, formerly `middleware.ts`).
 *
 * Next.js 16 deprecated the `middleware.ts` convention in favor of
 * `proxy.ts` running on the Node.js runtime. The old `middleware.ts`
 * file was silently not executed, leaving routes unprotected.
 */

const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/g/', // Public goal pages (prefix match)
  '/m/', // Public mentor pages (prefix match)
  '/pricing',
  '/api/auth/', // Better Auth routes
  '/api/webhook/', // Webhook endpoints
]

const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.some((route) => {
    // The root route only matches exactly, otherwise every path
    // would be treated as public (everything starts with '/')
    if (route === '/') {
      return pathname === '/'
    }
    if (route.endsWith('/')) {
      return pathname === route.slice(0, -1) || pathname.startsWith(route)
    }
    return pathname === route || pathname.startsWith(route + '/')
  })
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Check for Better Auth session cookie.
  // getSessionCookie handles both `better-auth.session_token` (HTTP/localhost)
  // and `__Secure-better-auth.session_token` (HTTPS deployments like Vercel).
  const sessionCookie = getSessionCookie(request)

  // If no session, redirect to sign-in
  if (!sessionCookie) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Session exists, allow the request
  // Note: Full session validation happens in server components/API routes
  // The proxy just checks for the presence of the cookie
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes (except auth)
    '/(api(?!/auth))(.*)',
  ],
}
