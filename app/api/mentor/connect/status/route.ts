import { NextResponse } from 'next/server'
import { requireAuth, requireMentor } from '@/lib/clerk'
import { getMentorConnectStatus } from '@/lib/stripe/connect'

/**
 * GET /api/mentor/connect/status
 * Stripe Connect account status for the authenticated mentor.
 */
export async function GET() {
  try {
    await requireAuth()
    const profile = await requireMentor()

    const status = await getMentorConnectStatus(profile.id)

    return NextResponse.json({ data: status })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      )
    }

    console.error('GET /api/mentor/connect/status:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch Connect status' } },
      { status: 500 }
    )
  }
}
