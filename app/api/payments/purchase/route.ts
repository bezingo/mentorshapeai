import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { ensureUserAndProfile, requireAuth } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { isStripeConfigured } from '@/lib/stripe/config'
import { getMentorConnectStatus } from '@/lib/stripe/connect'
import { createOfferPaymentIntent } from '@/lib/stripe/payment-intents'
import { createTransactionRecord } from '@/lib/payments/transactions'

const PurchaseSchema = z.object({
  mentor_offer_id: z.string().uuid(),
})

/**
 * POST /api/payments/purchase
 * Create a PaymentIntent for a digital product offer.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not configured' } },
        { status: 503 }
      )
    }

    const body = await request.json()
    const parsed = PurchaseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0].message,
          },
        },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { data: offer, error } = await supabase
      .from('mentor_offers')
      .select(
        'id, mentor_profile_id, type, price_cents, currency, payment_required, is_active'
      )
      .eq('id', parsed.data.mentor_offer_id)
      .single()

    if (error || !offer) {
      return NextResponse.json(
        { error: { code: 'OFFER_NOT_FOUND', message: 'Offer not found' } },
        { status: 404 }
      )
    }

    if (!offer.is_active || offer.type !== 'digital_product') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_OFFER',
            message: 'Only active digital product offers can be purchased',
          },
        },
        { status: 400 }
      )
    }

    if (offer.payment_required || !offer.price_cents) {
      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_SETUP_REQUIRED',
            message: 'This product is not available for purchase yet',
          },
        },
        { status: 402 }
      )
    }

    const connect = await getMentorConnectStatus(offer.mentor_profile_id)
    if (!connect.account_id || !connect.ready_for_payments) {
      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_SETUP_REQUIRED',
            message: 'Mentor payment account is not ready',
          },
        },
        { status: 402 }
      )
    }

    const intent = await createOfferPaymentIntent({
      amountCents: offer.price_cents,
      currency: offer.currency ?? 'usd',
      mentorConnectAccountId: connect.account_id,
      metadata: {
        mentor_offer_id: offer.id,
        buyer_profile_id: profile.id,
        mentor_profile_id: offer.mentor_profile_id,
        purchase_type: 'digital_product',
      },
    })

    await createTransactionRecord({
      buyer_profile_id: profile.id,
      mentor_profile_id: offer.mentor_profile_id,
      mentor_offer_id: offer.id,
      stripe_payment_intent_id: intent.payment_intent_id,
      amount_cents: offer.price_cents,
      platform_fee_cents: intent.application_fee_cents,
      status: 'pending',
    })

    return NextResponse.json({
      data: {
        client_secret: intent.client_secret,
        payment_intent_id: intent.payment_intent_id,
        publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('POST /api/payments/purchase:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create purchase' } },
      { status: 500 }
    )
  }
}
