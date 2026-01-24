/**
 * Unit tests for focus validation utilities
 *
 * Tests cover:
 * - BookFocusSchema validation
 * - UpdateFocusSchema validation
 * - ListFocusesQuerySchema validation
 * - Status transition validation (isValidFocusStatusTransition)
 * - Focus state checks (canCancelFocus, canRescheduleFocus)
 * - Timestamp generation (getFocusStatusTimestamps)
 * - Time validation (isScheduledTimeInFuture, calculateFocusEndTime, doFocusTimesOverlap)
 * - Booking timing constraints (validateBookingTiming)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  BookFocusSchema,
  UpdateFocusSchema,
  ListFocusesQuerySchema,
  FocusStatuses,
  FocusDurations,
  isValidFocusStatusTransition,
  canCancelFocus,
  canRescheduleFocus,
  getFocusStatusTimestamps,
  isScheduledTimeInFuture,
  calculateFocusEndTime,
  doFocusTimesOverlap,
  validateBookingTiming,
  MIN_BOOKING_NOTICE_HOURS,
  MAX_BOOKING_ADVANCE_DAYS,
  type FocusStatus,
} from '@/lib/validations/focus'

describe('Focus Validation Utilities', () => {
  // ============================================================
  // BookFocusSchema Tests
  // ============================================================
  describe('BookFocusSchema', () => {
    it('should accept valid booking data', () => {
      const validData = {
        scheduled_at: '2026-02-01T14:00:00.000Z',
        duration_minutes: 60,
        meeting_url: 'https://zoom.us/j/123456789',
        meeting_provider: 'zoom',
      }

      const result = BookFocusSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept minimal booking data with defaults', () => {
      const minimalData = {
        scheduled_at: '2026-02-01T14:00:00.000Z',
      }

      const result = BookFocusSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.duration_minutes).toBe(60) // default
      }
    })

    it('should accept 30-minute duration', () => {
      const data = {
        scheduled_at: '2026-02-01T14:00:00.000Z',
        duration_minutes: 30,
      }

      const result = BookFocusSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept 60-minute duration', () => {
      const data = {
        scheduled_at: '2026-02-01T14:00:00.000Z',
        duration_minutes: 60,
      }

      const result = BookFocusSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject invalid duration', () => {
      const data = {
        scheduled_at: '2026-02-01T14:00:00.000Z',
        duration_minutes: 45,
      }

      const result = BookFocusSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('30 or 60')
      }
    })

    it('should reject invalid datetime format', () => {
      const data = {
        scheduled_at: '2026-02-01 14:00:00',
      }

      const result = BookFocusSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid meeting URL', () => {
      const data = {
        scheduled_at: '2026-02-01T14:00:00.000Z',
        meeting_url: 'not-a-url',
      }

      const result = BookFocusSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept all valid meeting providers', () => {
      const providers = ['zoom', 'google_meet', 'teams'] as const

      for (const provider of providers) {
        const data = {
          scheduled_at: '2026-02-01T14:00:00.000Z',
          meeting_provider: provider,
        }

        const result = BookFocusSchema.safeParse(data)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid meeting provider', () => {
      const data = {
        scheduled_at: '2026-02-01T14:00:00.000Z',
        meeting_provider: 'skype',
      }

      const result = BookFocusSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  // ============================================================
  // UpdateFocusSchema Tests
  // ============================================================
  describe('UpdateFocusSchema', () => {
    it('should accept valid reschedule data', () => {
      const data = {
        scheduled_at: '2026-02-02T15:00:00.000Z',
      }

      const result = UpdateFocusSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept cancellation data', () => {
      const data = {
        status: 'cancelled',
        cancellation_reason: 'Schedule conflict',
      }

      const result = UpdateFocusSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept meeting URL update', () => {
      const data = {
        meeting_url: 'https://zoom.us/j/987654321',
      }

      const result = UpdateFocusSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject cancellation_reason without cancelled status', () => {
      const data = {
        cancellation_reason: 'Some reason',
      }

      const result = UpdateFocusSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject cancellation_reason exceeding 500 characters', () => {
      const data = {
        status: 'cancelled',
        cancellation_reason: 'A'.repeat(501),
      }

      const result = UpdateFocusSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('500')
      }
    })

    it('should accept empty object', () => {
      const result = UpdateFocusSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  // ============================================================
  // ListFocusesQuerySchema Tests
  // ============================================================
  describe('ListFocusesQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const data = {
        status: 'scheduled',
        from_date: '2026-01-01',
        to_date: '2026-12-31',
        limit: '20',
        offset: '0',
      }

      const result = ListFocusesQuerySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept empty query parameters', () => {
      const result = ListFocusesQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept all valid status values', () => {
      for (const status of FocusStatuses) {
        const result = ListFocusesQuerySchema.safeParse({ status })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid date format for from_date', () => {
      const data = { from_date: '01-01-2026' }

      const result = ListFocusesQuerySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid date format for to_date', () => {
      const data = { to_date: '2026/12/31' }

      const result = ListFocusesQuerySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept valid YYYY-MM-DD date format', () => {
      const data = {
        from_date: '2026-01-15',
        to_date: '2026-06-30',
      }

      const result = ListFocusesQuerySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject limit below 1', () => {
      const data = { limit: '0' }

      const result = ListFocusesQuerySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject limit above 100', () => {
      const data = { limit: '101' }

      const result = ListFocusesQuerySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject negative offset', () => {
      const data = { offset: '-1' }

      const result = ListFocusesQuerySchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  // ============================================================
  // Status Transition Tests
  // ============================================================
  describe('isValidFocusStatusTransition', () => {
    describe('from scheduled status', () => {
      it('should allow transition to in_progress', () => {
        const result = isValidFocusStatusTransition('scheduled', 'in_progress')
        expect(result.valid).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        const result = isValidFocusStatusTransition('scheduled', 'cancelled')
        expect(result.valid).toBe(true)
      })

      it('should allow transition to no_show', () => {
        const result = isValidFocusStatusTransition('scheduled', 'no_show')
        expect(result.valid).toBe(true)
      })

      it('should NOT allow transition to completed', () => {
        const result = isValidFocusStatusTransition('scheduled', 'completed')
        expect(result.valid).toBe(false)
      })
    })

    describe('from in_progress status', () => {
      it('should allow transition to completed', () => {
        const result = isValidFocusStatusTransition('in_progress', 'completed')
        expect(result.valid).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        const result = isValidFocusStatusTransition('in_progress', 'cancelled')
        expect(result.valid).toBe(true)
      })

      it('should NOT allow transition to scheduled', () => {
        const result = isValidFocusStatusTransition('in_progress', 'scheduled')
        expect(result.valid).toBe(false)
      })

      it('should NOT allow transition to no_show', () => {
        const result = isValidFocusStatusTransition('in_progress', 'no_show')
        expect(result.valid).toBe(false)
      })
    })

    describe('from terminal statuses', () => {
      it('should NOT allow any transitions from completed', () => {
        const statuses: FocusStatus[] = ['scheduled', 'in_progress', 'cancelled', 'no_show']

        for (const status of statuses) {
          const result = isValidFocusStatusTransition('completed', status)
          expect(result.valid).toBe(false)
        }
      })

      it('should NOT allow any transitions from cancelled', () => {
        const statuses: FocusStatus[] = ['scheduled', 'in_progress', 'completed', 'no_show']

        for (const status of statuses) {
          const result = isValidFocusStatusTransition('cancelled', status)
          expect(result.valid).toBe(false)
        }
      })

      it('should NOT allow any transitions from no_show', () => {
        const statuses: FocusStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled']

        for (const status of statuses) {
          const result = isValidFocusStatusTransition('no_show', status)
          expect(result.valid).toBe(false)
        }
      })
    })

    describe('same status transitions', () => {
      it('should allow staying in the same status', () => {
        for (const status of FocusStatuses) {
          const result = isValidFocusStatusTransition(status, status)
          expect(result.valid).toBe(true)
        }
      })
    })
  })

  // ============================================================
  // State Check Functions Tests
  // ============================================================
  describe('canCancelFocus', () => {
    it('should return true for scheduled status', () => {
      expect(canCancelFocus('scheduled')).toBe(true)
    })

    it('should return true for in_progress status', () => {
      expect(canCancelFocus('in_progress')).toBe(true)
    })

    it('should return false for completed status', () => {
      expect(canCancelFocus('completed')).toBe(false)
    })

    it('should return false for cancelled status', () => {
      expect(canCancelFocus('cancelled')).toBe(false)
    })

    it('should return false for no_show status', () => {
      expect(canCancelFocus('no_show')).toBe(false)
    })
  })

  describe('canRescheduleFocus', () => {
    it('should return true only for scheduled status', () => {
      expect(canRescheduleFocus('scheduled')).toBe(true)
    })

    it('should return false for in_progress status', () => {
      expect(canRescheduleFocus('in_progress')).toBe(false)
    })

    it('should return false for completed status', () => {
      expect(canRescheduleFocus('completed')).toBe(false)
    })

    it('should return false for cancelled status', () => {
      expect(canRescheduleFocus('cancelled')).toBe(false)
    })

    it('should return false for no_show status', () => {
      expect(canRescheduleFocus('no_show')).toBe(false)
    })
  })

  // ============================================================
  // Timestamp Generation Tests
  // ============================================================
  describe('getFocusStatusTimestamps', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-24T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return completed_at for completed status', () => {
      const result = getFocusStatusTimestamps('completed')

      expect(result).toHaveProperty('completed_at')
      expect(result.completed_at).toBe('2026-01-24T12:00:00.000Z')
    })

    it('should return cancelled_at and cancelled_by for cancelled status', () => {
      const profileId = 'profile-123'
      const result = getFocusStatusTimestamps('cancelled', profileId)

      expect(result).toHaveProperty('cancelled_at')
      expect(result).toHaveProperty('cancelled_by')
      expect(result.cancelled_at).toBe('2026-01-24T12:00:00.000Z')
      expect(result.cancelled_by).toBe(profileId)
    })

    it('should return cancelled_by as null when profileId not provided', () => {
      const result = getFocusStatusTimestamps('cancelled')

      expect(result.cancelled_by).toBeNull()
    })

    it('should return empty object for scheduled status', () => {
      const result = getFocusStatusTimestamps('scheduled')

      expect(result).toEqual({})
    })

    it('should return empty object for in_progress status', () => {
      const result = getFocusStatusTimestamps('in_progress')

      expect(result).toEqual({})
    })
  })

  // ============================================================
  // Time Validation Tests
  // ============================================================
  describe('isScheduledTimeInFuture', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-24T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return true for future time', () => {
      const futureTime = '2026-01-24T14:00:00.000Z'
      expect(isScheduledTimeInFuture(futureTime)).toBe(true)
    })

    it('should return false for past time', () => {
      const pastTime = '2026-01-24T10:00:00.000Z'
      expect(isScheduledTimeInFuture(pastTime)).toBe(false)
    })

    it('should return false for current time', () => {
      const currentTime = '2026-01-24T12:00:00.000Z'
      expect(isScheduledTimeInFuture(currentTime)).toBe(false)
    })
  })

  describe('calculateFocusEndTime', () => {
    it('should calculate end time for 30-minute focus', () => {
      const startTime = '2026-01-24T14:00:00.000Z'
      const endTime = calculateFocusEndTime(startTime, 30)

      expect(endTime.toISOString()).toBe('2026-01-24T14:30:00.000Z')
    })

    it('should calculate end time for 60-minute focus', () => {
      const startTime = '2026-01-24T14:00:00.000Z'
      const endTime = calculateFocusEndTime(startTime, 60)

      expect(endTime.toISOString()).toBe('2026-01-24T15:00:00.000Z')
    })

    it('should handle midnight crossing', () => {
      const startTime = '2026-01-24T23:30:00.000Z'
      const endTime = calculateFocusEndTime(startTime, 60)

      expect(endTime.toISOString()).toBe('2026-01-25T00:30:00.000Z')
    })
  })

  describe('doFocusTimesOverlap', () => {
    it('should detect full overlap', () => {
      const start1 = new Date('2026-01-24T14:00:00.000Z')
      const end1 = new Date('2026-01-24T15:00:00.000Z')
      const start2 = new Date('2026-01-24T14:00:00.000Z')
      const end2 = new Date('2026-01-24T15:00:00.000Z')

      expect(doFocusTimesOverlap(start1, end1, start2, end2)).toBe(true)
    })

    it('should detect partial overlap (first starts before second)', () => {
      const start1 = new Date('2026-01-24T14:00:00.000Z')
      const end1 = new Date('2026-01-24T15:00:00.000Z')
      const start2 = new Date('2026-01-24T14:30:00.000Z')
      const end2 = new Date('2026-01-24T15:30:00.000Z')

      expect(doFocusTimesOverlap(start1, end1, start2, end2)).toBe(true)
    })

    it('should detect partial overlap (second starts before first)', () => {
      const start1 = new Date('2026-01-24T14:30:00.000Z')
      const end1 = new Date('2026-01-24T15:30:00.000Z')
      const start2 = new Date('2026-01-24T14:00:00.000Z')
      const end2 = new Date('2026-01-24T15:00:00.000Z')

      expect(doFocusTimesOverlap(start1, end1, start2, end2)).toBe(true)
    })

    it('should detect when one contains the other', () => {
      const start1 = new Date('2026-01-24T13:00:00.000Z')
      const end1 = new Date('2026-01-24T16:00:00.000Z')
      const start2 = new Date('2026-01-24T14:00:00.000Z')
      const end2 = new Date('2026-01-24T15:00:00.000Z')

      expect(doFocusTimesOverlap(start1, end1, start2, end2)).toBe(true)
    })

    it('should NOT detect overlap for adjacent times (end = start)', () => {
      const start1 = new Date('2026-01-24T14:00:00.000Z')
      const end1 = new Date('2026-01-24T15:00:00.000Z')
      const start2 = new Date('2026-01-24T15:00:00.000Z')
      const end2 = new Date('2026-01-24T16:00:00.000Z')

      expect(doFocusTimesOverlap(start1, end1, start2, end2)).toBe(false)
    })

    it('should NOT detect overlap for non-overlapping times', () => {
      const start1 = new Date('2026-01-24T14:00:00.000Z')
      const end1 = new Date('2026-01-24T15:00:00.000Z')
      const start2 = new Date('2026-01-24T16:00:00.000Z')
      const end2 = new Date('2026-01-24T17:00:00.000Z')

      expect(doFocusTimesOverlap(start1, end1, start2, end2)).toBe(false)
    })
  })

  // ============================================================
  // Booking Timing Validation Tests
  // ============================================================
  describe('validateBookingTiming', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-24T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should accept booking within valid range', () => {
      // 3 hours from now (more than minimum notice)
      const scheduledAt = '2026-01-24T15:00:00.000Z'
      const result = validateBookingTiming(scheduledAt)

      expect(result.valid).toBe(true)
    })

    it('should reject booking with less than minimum notice', () => {
      // 1 hour from now (less than MIN_BOOKING_NOTICE_HOURS)
      const scheduledAt = '2026-01-24T13:00:00.000Z'
      const result = validateBookingTiming(scheduledAt)

      expect(result.valid).toBe(false)
      expect(result.error).toContain(`${MIN_BOOKING_NOTICE_HOURS}`)
    })

    it('should accept booking exactly at minimum notice time', () => {
      // Exactly 2 hours from now - should be valid since "at least 2 hours" includes exactly 2 hours
      const scheduledAt = '2026-01-24T14:00:00.000Z'
      const result = validateBookingTiming(scheduledAt)

      expect(result.valid).toBe(true)
    })

    it('should accept booking at maximum advance days', () => {
      // 30 days from now (within MAX_BOOKING_ADVANCE_DAYS)
      const futureDate = new Date('2026-01-24T12:00:00.000Z')
      futureDate.setDate(futureDate.getDate() + 30)
      const scheduledAt = futureDate.toISOString()

      const result = validateBookingTiming(scheduledAt)
      expect(result.valid).toBe(true)
    })

    it('should reject booking beyond maximum advance days', () => {
      // 61 days from now (beyond MAX_BOOKING_ADVANCE_DAYS)
      const futureDate = new Date('2026-01-24T12:00:00.000Z')
      futureDate.setDate(futureDate.getDate() + 61)
      const scheduledAt = futureDate.toISOString()

      const result = validateBookingTiming(scheduledAt)
      expect(result.valid).toBe(false)
      expect(result.error).toContain(`${MAX_BOOKING_ADVANCE_DAYS}`)
    })
  })

  // ============================================================
  // Constants Tests
  // ============================================================
  describe('Constants', () => {
    it('should have FocusStatuses with expected values', () => {
      expect(FocusStatuses).toContain('scheduled')
      expect(FocusStatuses).toContain('in_progress')
      expect(FocusStatuses).toContain('completed')
      expect(FocusStatuses).toContain('cancelled')
      expect(FocusStatuses).toContain('no_show')
      expect(FocusStatuses.length).toBe(5)
    })

    it('should have FocusDurations with expected values', () => {
      expect(FocusDurations).toContain(30)
      expect(FocusDurations).toContain(60)
      expect(FocusDurations.length).toBe(2)
    })

    it('should have MIN_BOOKING_NOTICE_HOURS set to 2', () => {
      expect(MIN_BOOKING_NOTICE_HOURS).toBe(2)
    })

    it('should have MAX_BOOKING_ADVANCE_DAYS set to 60', () => {
      expect(MAX_BOOKING_ADVANCE_DAYS).toBe(60)
    })
  })
})
