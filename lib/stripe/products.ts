import { getStripeClient } from '@/lib/stripe/config'

export interface OfferStripeCatalog {
  stripe_product_id: string
  stripe_price_id: string
}

export async function ensureOfferStripeCatalog(params: {
  offerId: string
  title: string
  description?: string | null
  priceCents: number
  currency: string
  existingProductId?: string | null
  existingPriceId?: string | null
}): Promise<OfferStripeCatalog> {
  const stripe = getStripeClient()
  const currency = params.currency.toLowerCase()

  let productId = params.existingProductId

  if (!productId) {
    const product = await stripe.products.create({
      name: params.title,
      description: params.description ?? undefined,
      metadata: {
        mentor_offer_id: params.offerId,
      },
    })
    productId = product.id
  } else {
    await stripe.products.update(productId, {
      name: params.title,
      description: params.description ?? undefined,
    })
  }

  let priceId = params.existingPriceId

  if (priceId) {
    const existingPrice = await stripe.prices.retrieve(priceId)
    if (
      existingPrice.unit_amount === params.priceCents &&
      existingPrice.currency === currency
    ) {
      return { stripe_product_id: productId, stripe_price_id: priceId }
    }
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: params.priceCents,
    currency,
  })

  return { stripe_product_id: productId, stripe_price_id: price.id }
}
