import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import {
  createTransactionRecord,
  getTransactionByPaymentIntent,
  recordWebhookEventProcessed,
  updateTransactionByPaymentIntent,
} from '@/lib/payments/transactions'
import { syncConnectAccountFromStripe } from '@/lib/stripe/connect'

function metadataString(
  metadata: Stripe.Metadata | null | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      if (account.id) {
        await syncConnectAccountFromStripe(account.id)
      }
      break
    }
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      await handlePaymentIntentSucceeded(paymentIntent)
      break
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      await handlePaymentIntentFailed(paymentIntent)
      break
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      if (charge.payment_intent && typeof charge.payment_intent === 'string') {
        await handleChargeRefunded(charge.payment_intent)
      }
      break
    }
    case 'payout.paid':
    case 'payout.failed': {
      const payout = event.data.object as Stripe.Payout
      await handlePayoutEvent(payout, event.type)
      break
    }
    default:
      break
  }

  await recordWebhookEventProcessed(event.id, event.type)
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const existing = await getTransactionByPaymentIntent(paymentIntent.id)
  if (existing) {
    await updateTransactionByPaymentIntent(paymentIntent.id, { status: 'succeeded' })
  } else {
    const mentorOfferId = metadataString(paymentIntent.metadata, 'mentor_offer_id')
    const buyerProfileId = metadataString(paymentIntent.metadata, 'buyer_profile_id')
    const mentorProfileId = metadataString(paymentIntent.metadata, 'mentor_profile_id')
    const focusId = metadataString(paymentIntent.metadata, 'focus_id')

    if (mentorOfferId && buyerProfileId && mentorProfileId) {
      await createTransactionRecord({
        buyer_profile_id: buyerProfileId,
        mentor_profile_id: mentorProfileId,
        mentor_offer_id: mentorOfferId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: paymentIntent.amount,
        platform_fee_cents: paymentIntent.application_fee_amount ?? 0,
        status: 'succeeded',
        focus_id: focusId ?? null,
      })
    }
  }

  const focusId = metadataString(paymentIntent.metadata, 'focus_id')
  if (focusId) {
    const supabase = createServiceClient()
    await supabase
      .from('focuses')
      .update({ status: 'scheduled', updated_at: new Date().toISOString() })
      .eq('id', focusId)
      .eq('status', 'pending_payment')
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const existing = await getTransactionByPaymentIntent(paymentIntent.id)

  if (existing) {
    await updateTransactionByPaymentIntent(paymentIntent.id, { status: 'failed' })
  } else {
    const mentorOfferId = metadataString(paymentIntent.metadata, 'mentor_offer_id')
    const buyerProfileId = metadataString(paymentIntent.metadata, 'buyer_profile_id')
    const mentorProfileId = metadataString(paymentIntent.metadata, 'mentor_profile_id')
    const focusId = metadataString(paymentIntent.metadata, 'focus_id')

    if (mentorOfferId && buyerProfileId && mentorProfileId) {
      await createTransactionRecord({
        buyer_profile_id: buyerProfileId,
        mentor_profile_id: mentorProfileId,
        mentor_offer_id: mentorOfferId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: paymentIntent.amount,
        platform_fee_cents: paymentIntent.application_fee_amount ?? 0,
        status: 'failed',
        focus_id: focusId ?? null,
      })
    }
  }

  const focusId = metadataString(paymentIntent.metadata, 'focus_id')
  if (focusId) {
    const supabase = createServiceClient()
    await supabase
      .from('focuses')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', focusId)
      .eq('status', 'pending_payment')
  }
}

async function handleChargeRefunded(paymentIntentId: string) {
  await updateTransactionByPaymentIntent(paymentIntentId, { status: 'refunded' })

  const supabase = createServiceClient()
  const { data: transaction } = await supabase
    .from('transactions')
    .select('focus_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (transaction?.focus_id) {
    await supabase
      .from('focuses')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.focus_id)
  }
}

async function handlePayoutEvent(payout: Stripe.Payout, type: string) {
  const supabase = createServiceClient()
  const mentorProfileId = metadataString(payout.metadata, 'mentor_profile_id')

  if (!mentorProfileId) {
    return
  }

  await supabase.from('mentor_payouts').upsert(
    {
      mentor_profile_id: mentorProfileId,
      stripe_payout_id: payout.id,
      amount_cents: payout.amount,
      currency: payout.currency,
      status: type === 'payout.paid' ? 'paid' : 'failed',
      arrival_date: payout.arrival_date
        ? new Date(payout.arrival_date * 1000).toISOString().slice(0, 10)
        : null,
    },
    { onConflict: 'stripe_payout_id' }
  )
}
