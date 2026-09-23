import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildNotificationEmailHtml,
  isEmailConfigured,
  sendNotificationEmail,
} from '@/lib/notifications/email'

describe('notification email utilities', () => {
  const originalResendKey = process.env.RESEND_API_KEY

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.RESEND_API_KEY = originalResendKey
  })

  it('buildNotificationEmailHtml includes title and action link', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
    const html = buildNotificationEmailHtml({
      title: 'Hello',
      message: 'World',
      actionUrl: '/dashboard',
    })

    expect(html).toContain('Hello')
    expect(html).toContain('World')
    expect(html).toContain('https://app.test/dashboard')
  })

  it('isEmailConfigured reflects RESEND_API_KEY', () => {
    delete process.env.RESEND_API_KEY
    expect(isEmailConfigured()).toBe(false)

    process.env.RESEND_API_KEY = 're_test'
    expect(isEmailConfigured()).toBe(true)
  })

  it('sendNotificationEmail gracefully skips without API key', async () => {
    delete process.env.RESEND_API_KEY
    const result = await sendNotificationEmail({
      to: 'user@test.com',
      subject: 'Test',
      html: '<p>Test</p>',
    })

    expect(result.sent).toBe(false)
    expect(result.reason).toContain('RESEND_API_KEY')
  })
})
