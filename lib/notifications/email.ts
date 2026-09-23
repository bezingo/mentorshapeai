import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export function buildNotificationEmailHtml(options: {
  title: string
  message: string
  actionUrl?: string
  preferencesUrl?: string
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const actionLink = options.actionUrl
    ? `${appUrl}${options.actionUrl.startsWith('/') ? options.actionUrl : `/${options.actionUrl}`}`
    : null
  const preferencesUrl =
    options.preferencesUrl || `${appUrl}/dashboard/settings/notifications`

  return `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
    <h2 style="margin-bottom: 8px;">${options.title}</h2>
    <p style="margin-top: 0;">${options.message}</p>
    ${
      actionLink
        ? `<p><a href="${actionLink}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">View in Mentorshape</a></p>`
        : ''
    }
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="font-size: 12px; color: #6b7280;">
      <a href="${preferencesUrl}">Manage notification preferences</a>
    </p>
  </body>
</html>
`.trim()
}

export async function sendNotificationEmail(options: {
  to: string
  subject: string
  html: string
}): Promise<{ sent: boolean; reason?: string }> {
  const client = getResendClient()
  if (!client) {
    return { sent: false, reason: 'RESEND_API_KEY not configured' }
  }

  const from =
    process.env.EMAIL_FROM || 'Mentorshape <notifications@mentorshape.com>'

  try {
    const { error } = await client.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    if (error) {
      console.error('Resend email error:', error)
      return { sent: false, reason: error.message }
    }

    return { sent: true }
  } catch (err) {
    console.error('Failed to send notification email:', err)
    return {
      sent: false,
      reason: err instanceof Error ? err.message : 'Unknown email error',
    }
  }
}
