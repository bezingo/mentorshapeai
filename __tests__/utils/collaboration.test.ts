/**
 * Unit tests for collaboration validation utilities
 *
 * Tests cover:
 * - CreateCollaborationSchema validation
 * - UpdateCollaborationSchema validation
 * - CancelCollaborationSchema validation
 * - ListCollaborationsQuerySchema validation
 * - Status transition validation (isValidStatusTransition)
 * - Timestamp generation (getStatusTimestamps)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CreateCollaborationSchema,
  UpdateCollaborationSchema,
  CancelCollaborationSchema,
  ListCollaborationsQuerySchema,
  CollaborationStatuses,
  isValidStatusTransition,
  getStatusTimestamps,
  type CollaborationStatus,
} from '@/lib/validations/collaboration'

describe('Collaboration Validation Utilities', () => {
  // ============================================================
  // CreateCollaborationSchema Tests
  // ============================================================
  describe('CreateCollaborationSchema', () => {
    it('should accept valid collaboration creation data', () => {
      const validData = {
        goal_id: '550e8400-e29b-41d4-a716-446655440001',
        mentor_profile_id: '550e8400-e29b-41d4-a716-446655440002',
        offer_id: '550e8400-e29b-41d4-a716-446655440003',
        request_message: 'I would like your help with my career goals.',
      }

      const result = CreateCollaborationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept data without optional fields', () => {
      const minimalData = {
        goal_id: '550e8400-e29b-41d4-a716-446655440001',
        mentor_profile_id: '550e8400-e29b-41d4-a716-446655440002',
      }

      const result = CreateCollaborationSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    it('should accept null offer_id', () => {
      const data = {
        goal_id: '550e8400-e29b-41d4-a716-446655440001',
        mentor_profile_id: '550e8400-e29b-41d4-a716-446655440002',
        offer_id: null,
      }

      const result = CreateCollaborationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject invalid goal_id UUID', () => {
      const data = {
        goal_id: 'not-a-uuid',
        mentor_profile_id: '550e8400-e29b-41d4-a716-446655440002',
      }

      const result = CreateCollaborationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid goal ID')
      }
    })

    it('should reject invalid mentor_profile_id UUID', () => {
      const data = {
        goal_id: '550e8400-e29b-41d4-a716-446655440001',
        mentor_profile_id: 'invalid',
      }

      const result = CreateCollaborationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid mentor profile ID')
      }
    })

    it('should reject request_message exceeding 2000 characters', () => {
      const data = {
        goal_id: '550e8400-e29b-41d4-a716-446655440001',
        mentor_profile_id: '550e8400-e29b-41d4-a716-446655440002',
        request_message: 'A'.repeat(2001),
      }

      const result = CreateCollaborationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('2000')
      }
    })

    it('should accept request_message at exactly 2000 characters', () => {
      const data = {
        goal_id: '550e8400-e29b-41d4-a716-446655440001',
        mentor_profile_id: '550e8400-e29b-41d4-a716-446655440002',
        request_message: 'A'.repeat(2000),
      }

      const result = CreateCollaborationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  // ============================================================
  // UpdateCollaborationSchema Tests
  // ============================================================
  describe('UpdateCollaborationSchema', () => {
    it('should accept valid status update', () => {
      const data = { status: 'accepted' }

      const result = UpdateCollaborationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept all valid status values', () => {
      for (const status of CollaborationStatuses) {
        const result = UpdateCollaborationSchema.safeParse({ status })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid status values', () => {
      const data = { status: 'invalid_status' }

      const result = UpdateCollaborationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept response_message', () => {
      const data = {
        status: 'accepted',
        response_message: 'I would be happy to mentor you!',
      }

      const result = UpdateCollaborationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject response_message exceeding 2000 characters', () => {
      const data = {
        status: 'accepted',
        response_message: 'A'.repeat(2001),
      }

      const result = UpdateCollaborationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('2000')
      }
    })

    it('should accept empty object (no updates)', () => {
      const result = UpdateCollaborationSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  // ============================================================
  // CancelCollaborationSchema Tests
  // ============================================================
  describe('CancelCollaborationSchema', () => {
    it('should accept valid cancellation reason', () => {
      const data = { reason: 'Schedule conflicts made it impossible to continue.' }

      const result = CancelCollaborationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept empty object (no reason)', () => {
      const result = CancelCollaborationSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept null reason', () => {
      const data = { reason: null }

      const result = CancelCollaborationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject reason exceeding 1000 characters', () => {
      const data = { reason: 'A'.repeat(1001) }

      const result = CancelCollaborationSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('1000')
      }
    })

    it('should accept reason at exactly 1000 characters', () => {
      const data = { reason: 'A'.repeat(1000) }

      const result = CancelCollaborationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  // ============================================================
  // ListCollaborationsQuerySchema Tests
  // ============================================================
  describe('ListCollaborationsQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const data = {
        as_mentor: 'true',
        as_mentee: 'false',
        status: 'active',
        limit: '20',
        offset: '0',
      }

      const result = ListCollaborationsQuerySchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.as_mentor).toBe(true)
        expect(result.data.as_mentee).toBe(false)
        expect(result.data.status).toBe('active')
        expect(result.data.limit).toBe(20)
        expect(result.data.offset).toBe(0)
      }
    })

    it('should accept empty query parameters', () => {
      const result = ListCollaborationsQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should transform string "true" to boolean true', () => {
      const data = { as_mentor: 'true' }

      const result = ListCollaborationsQuerySchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.as_mentor).toBe(true)
      }
    })

    it('should transform string "false" to boolean false', () => {
      const data = { as_mentee: 'false' }

      const result = ListCollaborationsQuerySchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.as_mentee).toBe(false)
      }
    })

    it('should reject invalid status value', () => {
      const data = { status: 'invalid' }

      const result = ListCollaborationsQuerySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject limit below 1', () => {
      const data = { limit: '0' }

      const result = ListCollaborationsQuerySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject limit above 100', () => {
      const data = { limit: '101' }

      const result = ListCollaborationsQuerySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept limit at boundary values', () => {
      // Lower boundary
      const lower = ListCollaborationsQuerySchema.safeParse({ limit: '1' })
      expect(lower.success).toBe(true)

      // Upper boundary
      const upper = ListCollaborationsQuerySchema.safeParse({ limit: '100' })
      expect(upper.success).toBe(true)
    })

    it('should reject negative offset', () => {
      const data = { offset: '-1' }

      const result = ListCollaborationsQuerySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept offset of 0', () => {
      const data = { offset: '0' }

      const result = ListCollaborationsQuerySchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  // ============================================================
  // Status Transition Tests
  // ============================================================
  describe('isValidStatusTransition', () => {
    describe('from pending status', () => {
      it('should allow transition to accepted (by mentor)', () => {
        const result = isValidStatusTransition('pending', 'accepted', true)
        expect(result.valid).toBe(true)
      })

      it('should NOT allow transition to accepted (by mentee)', () => {
        const result = isValidStatusTransition('pending', 'accepted', false)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Only the mentor')
      })

      it('should allow transition to declined (by mentor)', () => {
        const result = isValidStatusTransition('pending', 'declined', true)
        expect(result.valid).toBe(true)
      })

      it('should NOT allow transition to declined (by mentee)', () => {
        const result = isValidStatusTransition('pending', 'declined', false)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Only the mentor')
      })

      it('should allow transition to cancelled (by either party)', () => {
        const resultMentor = isValidStatusTransition('pending', 'cancelled', true)
        const resultMentee = isValidStatusTransition('pending', 'cancelled', false)

        expect(resultMentor.valid).toBe(true)
        expect(resultMentee.valid).toBe(true)
      })

      it('should NOT allow transition to active', () => {
        const result = isValidStatusTransition('pending', 'active', true)
        expect(result.valid).toBe(false)
      })

      it('should NOT allow transition to completed', () => {
        const result = isValidStatusTransition('pending', 'completed', true)
        expect(result.valid).toBe(false)
      })
    })

    describe('from accepted status', () => {
      it('should allow transition to active (by mentor)', () => {
        const result = isValidStatusTransition('accepted', 'active', true)
        expect(result.valid).toBe(true)
      })

      it('should NOT allow transition to active (by mentee)', () => {
        const result = isValidStatusTransition('accepted', 'active', false)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Only the mentor')
      })

      it('should allow transition to cancelled (by either party)', () => {
        const resultMentor = isValidStatusTransition('accepted', 'cancelled', true)
        const resultMentee = isValidStatusTransition('accepted', 'cancelled', false)

        expect(resultMentor.valid).toBe(true)
        expect(resultMentee.valid).toBe(true)
      })

      it('should NOT allow transition to declined', () => {
        const result = isValidStatusTransition('accepted', 'declined', true)
        expect(result.valid).toBe(false)
      })
    })

    describe('from active status', () => {
      it('should allow transition to completed (by either party)', () => {
        const resultMentor = isValidStatusTransition('active', 'completed', true)
        const resultMentee = isValidStatusTransition('active', 'completed', false)

        expect(resultMentor.valid).toBe(true)
        expect(resultMentee.valid).toBe(true)
      })

      it('should allow transition to cancelled (by either party)', () => {
        const resultMentor = isValidStatusTransition('active', 'cancelled', true)
        const resultMentee = isValidStatusTransition('active', 'cancelled', false)

        expect(resultMentor.valid).toBe(true)
        expect(resultMentee.valid).toBe(true)
      })

      it('should NOT allow transition to pending', () => {
        const result = isValidStatusTransition('active', 'pending', true)
        expect(result.valid).toBe(false)
      })
    })

    describe('from terminal statuses', () => {
      it('should NOT allow any transitions from completed', () => {
        const statuses: CollaborationStatus[] = ['pending', 'accepted', 'active', 'cancelled', 'declined']

        for (const status of statuses) {
          const result = isValidStatusTransition('completed', status, true)
          expect(result.valid).toBe(false)
        }
      })

      it('should NOT allow any transitions from cancelled', () => {
        const statuses: CollaborationStatus[] = ['pending', 'accepted', 'active', 'completed', 'declined']

        for (const status of statuses) {
          const result = isValidStatusTransition('cancelled', status, true)
          expect(result.valid).toBe(false)
        }
      })

      it('should NOT allow any transitions from declined', () => {
        const statuses: CollaborationStatus[] = ['pending', 'accepted', 'active', 'completed', 'cancelled']

        for (const status of statuses) {
          const result = isValidStatusTransition('declined', status, true)
          expect(result.valid).toBe(false)
        }
      })
    })

    describe('same status transitions', () => {
      it('should allow staying in the same status', () => {
        for (const status of CollaborationStatuses) {
          const result = isValidStatusTransition(status, status, true)
          expect(result.valid).toBe(true)
        }
      })
    })
  })

  // ============================================================
  // Timestamp Generation Tests
  // ============================================================
  describe('getStatusTimestamps', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-24T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return started_at for active status', () => {
      const result = getStatusTimestamps('active')

      expect(result).toHaveProperty('started_at')
      expect(result.started_at).toBe('2026-01-24T12:00:00.000Z')
    })

    it('should return completed_at for completed status', () => {
      const result = getStatusTimestamps('completed')

      expect(result).toHaveProperty('completed_at')
      expect(result.completed_at).toBe('2026-01-24T12:00:00.000Z')
    })

    it('should return cancelled_at for cancelled status', () => {
      const result = getStatusTimestamps('cancelled')

      expect(result).toHaveProperty('cancelled_at')
      expect(result.cancelled_at).toBe('2026-01-24T12:00:00.000Z')
    })

    it('should return empty object for pending status', () => {
      const result = getStatusTimestamps('pending')

      expect(result).toEqual({})
    })

    it('should return empty object for accepted status', () => {
      const result = getStatusTimestamps('accepted')

      expect(result).toEqual({})
    })

    it('should return empty object for declined status', () => {
      const result = getStatusTimestamps('declined')

      expect(result).toEqual({})
    })
  })

  // ============================================================
  // CollaborationStatuses Constant Tests
  // ============================================================
  describe('CollaborationStatuses constant', () => {
    it('should contain all expected statuses', () => {
      expect(CollaborationStatuses).toContain('pending')
      expect(CollaborationStatuses).toContain('accepted')
      expect(CollaborationStatuses).toContain('active')
      expect(CollaborationStatuses).toContain('completed')
      expect(CollaborationStatuses).toContain('cancelled')
      expect(CollaborationStatuses).toContain('declined')
    })

    it('should have exactly 6 statuses', () => {
      expect(CollaborationStatuses.length).toBe(6)
    })
  })
})
