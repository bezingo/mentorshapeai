import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/g/(.*)', // Public goal pages
  '/m/(.*)', // Public mentor pages
  '/pricing',
  '/api/webhook/(.*)', // Legacy webhook path
  '/api/webhooks/(.*)', // Zoom and other provider webhooks
  '/api/mentor/calendar/webhook', // Google Calendar push notifications
  '/api/public/mentor/(.*)', // Public mentor profile API (used on /m/[handle])
  '/api/cron/(.*)', // Cron jobs authenticate via CRON_SECRET in the route handler
])

const isDashboardRoute = createRouteMatcher([
  '/dashboard(.*)',
])

const isMentorRoute = createRouteMatcher([
  '/mentor(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // Protect dashboard routes
  if (isDashboardRoute(request)) {
    await auth.protect()
  }
  // Protect mentor routes (onboarding, etc.)
  else if (isMentorRoute(request)) {
    await auth.protect()
  }
  // Protect all other routes except public ones
  else if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

