import { describe, it, expect, afterEach } from 'vitest'
import { calculatePlatformFeeCents, getPlatformFeePercent } from '@/lib/stripe/config'
import { resolvePaymentRequired } from '@/lib/payments/offers'

describe('payments fees', () => {
  const originalEnv = process.env.STRIPE_PLATFORM_FEE_PERCENT

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.STRIPE_PLATFORM_FEE_PERCENT
    } else {
      process.env.STRIPE_PLATFORM_FEE_PERCENT = originalEnv
    }
  })

  it('defaults platform fee to 10%', () => {
    delete process.env.STRIPE_PLATFORM_FEE_PERCENT
    expect(getPlatformFeePercent()).toBe(10)
    expect(calculatePlatformFeeCents(10000)).toBe(1000)
  })

  it('respects STRIPE_PLATFORM_FEE_PERCENT when valid', () => {
    process.env.STRIPE_PLATFORM_FEE_PERCENT = '15'
    expect(calculatePlatformFeeCents(20000)).toBe(3000)
  })
})

describe('resolvePaymentRequired', () => {
  it('is false for free offers', () => {
    expect(resolvePaymentRequired('free_collab', false)).toBe(false)
    expect(resolvePaymentRequired('free_collab', true)).toBe(false)
  })

  it('is true for paid offers when connect is not ready', () => {
    expect(resolvePaymentRequired('paid_consult', false)).toBe(true)
    expect(resolvePaymentRequired('digital_product', false)).toBe(true)
  })

  it('is false for paid offers when connect is ready', () => {
    expect(resolvePaymentRequired('paid_consult', true)).toBe(false)
  })
})
