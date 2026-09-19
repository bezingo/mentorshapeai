import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/clerk'
import { getSubscriptionSummary } from '@/lib/billing/subscription'

/**
 * GET /api/billing/subscription
 * Returns Clerk Billing plan summary for the current user.
 */
export async function GET() {
  try {
    await requireAuth()
    const summary = await getSubscriptionSummary()
    return NextResponse.json({ data: summary })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('GET /api/billing/subscription:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscription' } },
      { status: 500 }
    )
  }
}
