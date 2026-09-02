import { NextRequest, NextResponse } from 'next/server'

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
    if (route.endsWith('/')) {
      return pathname === route.slice(0, -1) || pathname.startsWith(route)
    }
    return pathname === route || pathname.startsWith(route + '/')
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Check for Better Auth session cookie
  const sessionToken = request.cookies.get('better-auth.session_token')?.value

  // If no session, redirect to sign-in
  if (!sessionToken) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Session exists, allow the request
  // Note: Full session validation happens in server components/API routes
  // The middleware just checks for the presence of the cookie
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
