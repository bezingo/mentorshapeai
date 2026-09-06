import { Resend } from 'resend'

/**
 * Resend email client with safe no-op when RESEND_API_KEY is not configured.
 * This allows local development without crashing when email is not set up.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'Mentorshape <noreply@mentorshape.ai>'

/**
 * Check if email sending is configured
 */
export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY
}

/**
 * Get Resend client (only if configured)
 */
function getResendClient(): Resend | null {
  if (!RESEND_API_KEY) {
    return null
  }
  return new Resend(RESEND_API_KEY)
}

/**
 * Email send result
 */
export interface EmailResult {
  success: boolean
  id?: string
  error?: string
  skipped?: boolean
}

/**
 * Base email options
 */
export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

/**
 * Send an email via Resend.
 * If RESEND_API_KEY is not configured, logs the email and returns a skipped result.
 * This allows the app to function without email in development/test environments.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const resend = getResendClient()

  if (!resend) {
    console.log('[Email] Skipped (RESEND_API_KEY not configured):', {
      to: options.to,
      subject: options.subject,
    })
    return {
      success: true,
      skipped: true,
    }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    })

    if (error) {
      console.error('[Email] Send failed:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    console.log('[Email] Sent successfully:', {
      id: data?.id,
      to: options.to,
      subject: options.subject,
    })

    return {
      success: true,
      id: data?.id,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Email] Exception:', errorMessage)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Send multiple emails (batch)
 */
export async function sendEmails(
  emails: EmailOptions[]
): Promise<EmailResult[]> {
  return Promise.all(emails.map(sendEmail))
}
