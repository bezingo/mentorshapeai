import { describe, it, expect } from 'vitest'
import {
  ListNotificationsQuerySchema,
  MarkNotificationsReadSchema,
  PatchNotificationPreferencesSchema,
} from '@/lib/validations/notifications'

describe('notification validation schemas', () => {
  it('parses list query defaults', () => {
    const result = ListNotificationsQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(50)
      expect(result.data.unread_only).toBe(false)
    }
  })

  it('requires ids or all for mark read', () => {
    const invalid = MarkNotificationsReadSchema.safeParse({})
    expect(invalid.success).toBe(false)

    const byIds = MarkNotificationsReadSchema.safeParse({
      ids: ['550e8400-e29b-41d4-a716-446655440000'],
    })
    expect(byIds.success).toBe(true)

    const all = MarkNotificationsReadSchema.safeParse({ all: true })
    expect(all.success).toBe(true)
  })

  it('validates preference patch payload', () => {
    const result = PatchNotificationPreferencesSchema.safeParse({
      preferences: [
        { channel: 'email', type: 'collab_request', enabled: false },
      ],
    })
    expect(result.success).toBe(true)
  })
})
