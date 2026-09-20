import { createServiceClient } from '@/lib/supabase/service'
import { isStripeConfigured } from '@/lib/stripe/config'
import { getMentorConnectStatus } from '@/lib/stripe/connect'
import { ensureOfferStripeCatalog } from '@/lib/stripe/products'
import { resolvePaymentRequired } from '@/lib/payments/offers'

export async function syncMentorOfferStripeCatalog(
  mentorProfileId: string,
  offer: {
    id: string
    type: string
    title: string
    description?: string | null
    price_cents?: number | null
    currency?: string | null
    stripe_product_id?: string | null
    stripe_price_id?: string | null
  }
): Promise<{ payment_required: boolean; stripe_product_id?: string; stripe_price_id?: string }> {
  const connect = await getMentorConnectStatus(mentorProfileId)
  const payment_required = resolvePaymentRequired(offer.type, connect.ready_for_payments)

  if (
    !isStripeConfigured() ||
    !connect.ready_for_payments ||
    (offer.type !== 'paid_consult' && offer.type !== 'digital_product') ||
    !offer.price_cents
  ) {
    return { payment_required }
  }

  const catalog = await ensureOfferStripeCatalog({
    offerId: offer.id,
    title: offer.title,
    description: offer.description,
    priceCents: offer.price_cents,
    currency: offer.currency ?? 'usd',
    existingProductId: offer.stripe_product_id,
    existingPriceId: offer.stripe_price_id,
  })

  const supabase = createServiceClient()
  await supabase
    .from('mentor_offers')
    .update({
      stripe_product_id: catalog.stripe_product_id,
      stripe_price_id: catalog.stripe_price_id,
      payment_required: false,
    })
    .eq('id', offer.id)

  return {
    payment_required: false,
    stripe_product_id: catalog.stripe_product_id,
    stripe_price_id: catalog.stripe_price_id,
  }
}
