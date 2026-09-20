export const NOTIFICATION_CHANNELS = ['email', 'in_app', 'sms'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_TYPES = [
  'collab_request',
  'collab_accepted',
  'collab_declined',
  'collab_cancelled',
  'session_scheduled',
  'session_reminder',
  'session_completed',
  'session_cancelled',
  'milestone_completed',
  'goal_completed',
  'payment_success',
  'payment_failed',
  'match_proposed',
  'system_update',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface NotificationPayload {
  profileId: string
  type: NotificationType
  title: string
  message?: string
  actionUrl?: string
  metadata?: Record<string, unknown>
  emailSubject?: string
  emailHtml?: string
}

export interface NotificationRecord {
  id: string
  profile_id: string
  type: string
  title: string
  message: string | null
  action_url: string | null
  metadata: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}
