import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

vi.mock('@/lib/payments/transactions', () => ({
  createTransactionRecord: vi.fn(),
  getTransactionByPaymentIntent: vi.fn(),
  updateTransactionByPaymentIntent: vi.fn(),
  recordWebhookEventProcessed: vi.fn().mockResolvedValue({ duplicate: false }),
}))

vi.mock('@/lib/stripe/connect', () => ({
  syncConnectAccountFromStripe: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({}),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        })),
      })),
    })),
  })),
}))

import { handleStripeWebhookEvent } from '@/lib/stripe/webhook-handlers'
import {
  createTransactionRecord,
  getTransactionByPaymentIntent,
  recordWebhookEventProcessed,
} from '@/lib/payments/transactions'

describe('handleStripeWebhookEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates transaction on payment_intent.succeeded when missing', async () => {
    vi.mocked(getTransactionByPaymentIntent).mockResolvedValue(null)

    const event = {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_1',
          amount: 15000,
          application_fee_amount: 1500,
          metadata: {
            mentor_offer_id: 'offer-1',
            buyer_profile_id: 'buyer-1',
            mentor_profile_id: 'mentor-1',
          },
        },
      },
    } as unknown as Stripe.Event

    await handleStripeWebhookEvent(event)

    expect(createTransactionRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_payment_intent_id: 'pi_1',
        status: 'succeeded',
        amount_cents: 15000,
      })
    )
    expect(recordWebhookEventProcessed).toHaveBeenCalledWith('evt_1', 'payment_intent.succeeded')
  })
})
