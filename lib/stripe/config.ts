import Stripe from 'stripe'

const DEFAULT_PLATFORM_FEE_PERCENT = 10

export function getStripeSecretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export function getPlatformFeePercent(): number {
  const raw = process.env.STRIPE_PLATFORM_FEE_PERCENT
  if (!raw) return DEFAULT_PLATFORM_FEE_PERCENT
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
    ? parsed
    : DEFAULT_PLATFORM_FEE_PERCENT
}

export function calculatePlatformFeeCents(amountCents: number): number {
  const percent = getPlatformFeePercent()
  return Math.round((amountCents * percent) / 100)
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey())
}

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  const key = getStripeSecretKey()
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }
  return stripeClient
}
