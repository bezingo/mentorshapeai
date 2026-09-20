import { createServiceClient } from '@/lib/supabase/service'

export interface CreateTransactionInput {
  buyer_profile_id: string
  mentor_profile_id: string
  mentor_offer_id: string
  stripe_payment_intent_id: string
  amount_cents: number
  platform_fee_cents: number
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  focus_id?: string | null
}

export async function createTransactionRecord(input: CreateTransactionInput) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      buyer_profile_id: input.buyer_profile_id,
      mentor_profile_id: input.mentor_profile_id,
      mentor_offer_id: input.mentor_offer_id,
      stripe_payment_intent_id: input.stripe_payment_intent_id,
      amount_cents: input.amount_cents,
      platform_fee_cents: input.platform_fee_cents,
      status: input.status,
      focus_id: input.focus_id ?? null,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateTransactionByPaymentIntent(
  paymentIntentId: string,
  updates: {
    status?: 'pending' | 'succeeded' | 'failed' | 'refunded'
    stripe_refund_id?: string | null
  }
) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('stripe_payment_intent_id', paymentIntentId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getTransactionByPaymentIntent(paymentIntentId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  return data
}

export async function recordWebhookEventProcessed(eventId: string, type: string) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('stripe_webhook_events').insert({
    id: eventId,
    type,
  })

  if (error?.code === '23505') {
    return { duplicate: true }
  }
  if (error) {
    throw error
  }
  return { duplicate: false }
}

export async function isWebhookEventProcessed(eventId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle()

  return Boolean(data)
}
