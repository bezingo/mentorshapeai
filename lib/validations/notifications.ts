import { z } from 'zod'
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES } from '@/lib/notifications/types'

export const ListNotificationsQuerySchema = z.object({
  unread_only: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export const MarkNotificationsReadSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).optional(),
    all: z.boolean().optional(),
  })
  .refine((data) => data.all === true || (data.ids && data.ids.length > 0), {
    message: 'Provide notification ids or set all to true',
  })

export const NotificationPreferenceItemSchema = z.object({
  channel: z.enum(NOTIFICATION_CHANNELS),
  type: z.enum(NOTIFICATION_TYPES),
  enabled: z.boolean(),
})

export const PatchNotificationPreferencesSchema = z.object({
  preferences: z.array(NotificationPreferenceItemSchema).min(1),
})
