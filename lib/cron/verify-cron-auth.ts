import { NextRequest, NextResponse } from 'next/server'

/**
 * Validates Bearer CRON_SECRET for cron route handlers.
 * In development, auth is skipped when NODE_ENV is development.
 */
export function verifyCronAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isDev = process.env.NODE_ENV === 'development'

  if (!isDev && cronSecret) {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } },
        { status: 401 }
      )
    }
  }

  return null
}
