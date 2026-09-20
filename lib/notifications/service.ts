import { createServiceClient } from '@/lib/supabase/service'
import {
  buildNotificationEmailHtml,
  sendNotificationEmail,
} from '@/lib/notifications/email'
import type {
  NotificationChannel,
  NotificationPayload,
  NotificationType,
} from '@/lib/notifications/types'

const CRITICAL_EMAIL_TYPES: NotificationType[] = [
  'payment_failed',
  'payment_success',
]

async function getProfileEmail(profileId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, users!inner(email)')
    .eq('id', profileId)
    .single()

  if (error || !data) {
    return null
  }

  const users = data.users as { email: string } | { email: string }[]
  const user = Array.isArray(users) ? users[0] : users
  return user?.email ?? null
}

export async function isNotificationEnabled(
  profileId: string,
  channel: NotificationChannel,
  type: NotificationType
): Promise<boolean> {
  if (channel === 'sms') {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('notification_preferences')
      .select('enabled')
      .eq('profile_id', profileId)
      .eq('channel', 'sms')
      .eq('type', type)
      .maybeSingle()

    return data?.enabled ?? false
  }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('notification_preferences')
    .select('enabled')
    .eq('profile_id', profileId)
    .eq('channel', channel)
    .eq('type', type)
    .maybeSingle()

  if (!data) {
    return true
  }

  return data.enabled
}

export async function deliverNotification(
  payload: NotificationPayload
): Promise<{ inAppCreated: boolean; emailSent: boolean }> {
  const supabase = createServiceClient()
  let inAppCreated = false
  let emailSent = false

  const inAppEnabled = await isNotificationEnabled(
    payload.profileId,
    'in_app',
    payload.type
  )

  if (inAppEnabled) {
    const { error } = await supabase.from('notifications').insert({
      profile_id: payload.profileId,
      type: payload.type,
      title: payload.title,
      message: payload.message ?? null,
      action_url: payload.actionUrl ?? null,
      metadata: payload.metadata ?? null,
    })

    if (error) {
      console.error('Failed to create in-app notification:', error)
    } else {
      inAppCreated = true
    }
  }

  const emailEnabled = await isNotificationEnabled(
    payload.profileId,
    'email',
    payload.type
  )

  if (!emailEnabled && !CRITICAL_EMAIL_TYPES.includes(payload.type)) {
    return { inAppCreated, emailSent }
  }

  const email = await getProfileEmail(payload.profileId)
  if (!email) {
    return { inAppCreated, emailSent }
  }

  const subject = payload.emailSubject ?? payload.title
  const html =
    payload.emailHtml ??
    buildNotificationEmailHtml({
      title: payload.title,
      message: payload.message ?? '',
      actionUrl: payload.actionUrl,
    })

  const result = await sendNotificationEmail({
    to: email,
    subject,
    html,
  })
  emailSent = result.sent

  return { inAppCreated, emailSent }
}

export async function deliverNotificationToMany(
  profileIds: string[],
  buildPayload: (profileId: string) => NotificationPayload
): Promise<void> {
  const uniqueIds = [...new Set(profileIds)]
  await Promise.all(
    uniqueIds.map(async (profileId) => {
      try {
        await deliverNotification(buildPayload(profileId))
      } catch (err) {
        console.error(`Notification delivery failed for ${profileId}:`, err)
      }
    })
  )
}

export function notifyInBackground(promise: Promise<unknown>): void {
  void promise.catch((err) => {
    console.error('Background notification failed:', err)
  })
}
