import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { ensureUserAndProfile, requireAuth } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe/config'
import { updateTransactionByPaymentIntent } from '@/lib/payments/transactions'

const RefundSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
  refund_amount_cents: z.number().int().positive().optional(),
  refund_application_fee: z.boolean().default(true),
})

/**
 * POST /api/transactions/[transactionId]/refund
 * Refund a succeeded transaction (mentor for their sales, or buyer with eligibility rules).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
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

    const { transactionId } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = RefundSchema.safeParse(body)

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
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (error || !transaction) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      )
    }

    const isMentor = transaction.mentor_profile_id === profile.id
    const isBuyer = transaction.buyer_profile_id === profile.id

    if (!isMentor && !isBuyer) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to refund this transaction' } },
        { status: 403 }
      )
    }

    if (transaction.status !== 'succeeded') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATUS',
            message: 'Only succeeded transactions can be refunded',
          },
        },
        { status: 400 }
      )
    }

    const refundAmount = parsed.data.refund_amount_cents ?? transaction.amount_cents
    const stripe = getStripeClient()

    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripe_payment_intent_id,
      amount: refundAmount,
      reverse_transfer: true,
      refund_application_fee: parsed.data.refund_application_fee,
      metadata: {
        transaction_id: transaction.id,
        reason: parsed.data.reason ?? '',
      },
    })

    await updateTransactionByPaymentIntent(transaction.stripe_payment_intent_id, {
      status: 'refunded',
      stripe_refund_id: refund.id,
    })

    if (transaction.focus_id) {
      await supabase
        .from('focuses')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.focus_id)
    }

    return NextResponse.json({
      data: {
        refund_id: refund.id,
        status: refund.status,
        amount_cents: refund.amount,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('POST /api/transactions/[transactionId]/refund:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process refund' } },
      { status: 500 }
    )
  }
}
