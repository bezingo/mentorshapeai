import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { ensureUserAndProfile, requireAuth, requireMentor } from '@/lib/clerk'
import { isStripeConfigured } from '@/lib/stripe/config'
import { createConnectOnboardingLink } from '@/lib/stripe/connect'

/**
 * POST /api/mentor/connect/onboard
 * Create or resume Stripe Connect Express onboarding for the mentor.
 */
export async function POST() {
  try {
    await requireAuth()
    const profile = await requireMentor()

    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error: {
            code: 'STRIPE_NOT_CONFIGURED',
            message: 'Stripe is not configured on this environment',
          },
        },
        { status: 503 }
      )
    }

    const clerkUser = await currentUser()
    const email =
      clerkUser?.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress

    if (!email) {
      return NextResponse.json(
        { error: { code: 'EMAIL_REQUIRED', message: 'Account email is required' } },
        { status: 400 }
      )
    }

    const ensured = await ensureUserAndProfile()
    if (!ensured?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { url, account_id } = await createConnectOnboardingLink(ensured.id, email)

    return NextResponse.json({
      data: {
        onboarding_url: url,
        stripe_connect_account_id: account_id,
      },
    })
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

    console.error('POST /api/mentor/connect/onboard:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to start Connect onboarding' } },
      { status: 500 }
    )
  }
}
