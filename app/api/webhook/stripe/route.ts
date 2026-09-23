import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripeClient, getStripeWebhookSecret } from '@/lib/stripe/config'
import { handleStripeWebhookEvent } from '@/lib/stripe/webhook-handlers'
import { isWebhookEventProcessed } from '@/lib/payments/transactions'

export async function POST(req: Request) {
  const webhookSecret = getStripeWebhookSecret()
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'Webhook secret not configured' } },
      { status: 500 }
    )
  }

  const body = await req.text()
  const headerPayload = await headers()
  const signature = headerPayload.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: { code: 'MISSING_SIGNATURE', message: 'Missing stripe-signature header' } },
      { status: 400 }
    )
  }

  const stripe = getStripeClient()
  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json(
      { error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } },
      { status: 401 }
    )
  }

  if (await isWebhookEventProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    await handleStripeWebhookEvent(event)
  } catch (err) {
    console.error('Error processing Stripe webhook:', err)
    return NextResponse.json(
      { error: { code: 'PROCESSING_ERROR', message: 'Webhook processing failed' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
