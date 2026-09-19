import { calculatePlatformFeeCents, getStripeClient } from '@/lib/stripe/config'

export interface CreateOfferPaymentIntentParams {
  amountCents: number
  currency: string
  mentorConnectAccountId: string
  metadata: Record<string, string>
}

export async function createOfferPaymentIntent(
  params: CreateOfferPaymentIntentParams
) {
  const stripe = getStripeClient()
  const applicationFeeAmount = calculatePlatformFeeCents(params.amountCents)

  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amountCents,
    currency: params.currency.toLowerCase(),
    application_fee_amount: applicationFeeAmount,
    transfer_data: {
      destination: params.mentorConnectAccountId,
    },
    metadata: params.metadata,
    automatic_payment_methods: { enabled: true },
  })

  return {
    payment_intent_id: paymentIntent.id,
    client_secret: paymentIntent.client_secret,
    application_fee_cents: applicationFeeAmount,
  }
}
