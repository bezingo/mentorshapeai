/**
 * Email Service Tests - M1
 * 
 * Tests the Resend email service with safe no-op behavior
 * when RESEND_API_KEY is not configured.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  digestEmailTemplate,
  sessionReminderTemplate,
  collabRequestTemplate,
  type DigestEmailData,
  type SessionReminderData,
  type CollabRequestData,
} from '@/lib/email/templates'

describe('Email Templates', () => {
  describe('digestEmailTemplate', () => {
    it('should generate digest email with due tasks', () => {
      const data: DigestEmailData = {
        recipientName: 'John',
        dueTasks: [
          {
            title: 'Complete milestone 1',
            dueDate: '2024-03-15',
            collaborationTitle: 'Career Development',
          },
        ],
        nextFocus: null,
        pendingRequests: [],
      }

      const result = digestEmailTemplate(data)

      expect(result.subject).toContain('1 task(s) due')
      expect(result.html).toContain('Hi John')
      expect(result.html).toContain('Complete milestone 1')
      expect(result.html).toContain('Tasks Due Soon')
      expect(result.text).toContain('TASKS DUE SOON')
    })

    it('should generate digest email with next focus', () => {
      const data: DigestEmailData = {
        recipientName: 'Jane',
        dueTasks: [],
        nextFocus: {
          scheduledAt: '2024-03-20T14:00:00Z',
          mentorName: 'Dr. Smith',
          goalTitle: 'Finance Goal',
        },
        pendingRequests: [],
      }

      const result = digestEmailTemplate(data)

      expect(result.html).toContain('Hi Jane')
      expect(result.html).toContain('Next Focus Session')
      expect(result.html).toContain('Dr. Smith')
      expect(result.html).toContain('Finance Goal')
      expect(result.text).toContain('NEXT FOCUS')
    })

    it('should generate digest email with pending requests', () => {
      const data: DigestEmailData = {
        recipientName: 'Mentor Mike',
        dueTasks: [],
        nextFocus: null,
        pendingRequests: [
          {
            requesterName: 'Student Sarah',
            goalTitle: 'Career Pivot',
            requestedAt: '2024-03-10T10:00:00Z',
          },
        ],
      }

      const result = digestEmailTemplate(data)

      expect(result.html).toContain('Pending Requests')
      expect(result.html).toContain('Student Sarah')
      expect(result.html).toContain('Career Pivot')
      expect(result.text).toContain('PENDING REQUESTS')
    })

    it('should show empty state when nothing to report', () => {
      const data: DigestEmailData = {
        recipientName: 'Alex',
        dueTasks: [],
        nextFocus: null,
        pendingRequests: [],
      }

      const result = digestEmailTemplate(data)

      expect(result.html).toContain("You're all caught up")
      expect(result.html).toContain('No pending items')
    })
  })

  describe('sessionReminderTemplate', () => {
    it('should generate session reminder for mentor', () => {
      const data: SessionReminderData = {
        recipientName: 'Dr. Smith',
        recipientRole: 'mentor',
        partnerName: 'Student Sarah',
        goalTitle: 'Finance Planning',
        scheduledAt: '2024-03-20T14:00:00Z',
        durationMinutes: 60,
        meetingUrl: 'https://zoom.us/j/123456',
        focusId: 'focus-123',
      }

      const result = sessionReminderTemplate(data)

      expect(result.subject).toContain('Student Sarah')
      expect(result.html).toContain('Hi Dr. Smith')
      expect(result.html).toContain('Finance Planning')
      expect(result.html).toContain('mentee')
      expect(result.html).toContain('60 minutes')
      expect(result.html).toContain('Join Meeting')
      expect(result.html).toContain('https://zoom.us/j/123456')
    })

    it('should generate session reminder for mentee', () => {
      const data: SessionReminderData = {
        recipientName: 'Student Sarah',
        recipientRole: 'mentee',
        partnerName: 'Dr. Smith',
        goalTitle: 'Finance Planning',
        scheduledAt: '2024-03-20T14:00:00Z',
        durationMinutes: 45,
        focusId: 'focus-456',
      }

      const result = sessionReminderTemplate(data)

      expect(result.subject).toContain('Dr. Smith')
      expect(result.html).toContain('Hi Student Sarah')
      expect(result.html).toContain('mentor')
      expect(result.html).toContain('45 minutes')
      expect(result.html).not.toContain('Join Meeting')
    })

    it('should include text version', () => {
      const data: SessionReminderData = {
        recipientName: 'User',
        recipientRole: 'mentee',
        partnerName: 'Partner',
        goalTitle: 'Goal',
        scheduledAt: '2024-03-20T14:00:00Z',
        durationMinutes: 30,
        focusId: 'focus-789',
      }

      const result = sessionReminderTemplate(data)

      expect(result.text).toBeTruthy()
      expect(result.text).toContain('User')
      expect(result.text).toContain('Partner')
      expect(result.text).toContain('30 minutes')
    })
  })

  describe('collabRequestTemplate', () => {
    it('should generate collab request notification', () => {
      const data: CollabRequestData = {
        mentorName: 'Dr. Expert',
        menteeName: 'Eager Learner',
        goalTitle: 'Become a Data Scientist',
        goalDescription: 'Transition from software engineering to data science',
        requestMessage: 'I admire your work and would love your guidance!',
        collaborationId: 'collab-abc',
      }

      const result = collabRequestTemplate(data)

      expect(result.subject).toContain('Eager Learner')
      expect(result.html).toContain('Hi Dr. Expert')
      expect(result.html).toContain('Eager Learner')
      expect(result.html).toContain('Become a Data Scientist')
      expect(result.html).toContain('Transition from software engineering')
      expect(result.html).toContain('I admire your work')
      expect(result.html).toContain('Review Request')
    })

    it('should handle missing optional fields', () => {
      const data: CollabRequestData = {
        mentorName: 'Mentor',
        menteeName: 'Mentee',
        goalTitle: 'Simple Goal',
        collaborationId: 'collab-simple',
      }

      const result = collabRequestTemplate(data)

      expect(result.html).toContain('Mentor')
      expect(result.html).toContain('Mentee')
      expect(result.html).toContain('Simple Goal')
      expect(result.html).not.toContain('undefined')
    })
  })
})

describe('Email Service Configuration', () => {
  it('should export isEmailConfigured function', async () => {
    const { isEmailConfigured } = await import('@/lib/email/client')
    expect(typeof isEmailConfigured).toBe('function')
  })

  it('should return false when RESEND_API_KEY is not set', async () => {
    const originalEnv = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY

    // Re-import to get fresh module
    vi.resetModules()
    const { isEmailConfigured } = await import('@/lib/email/client')

    expect(isEmailConfigured()).toBe(false)

    // Restore
    if (originalEnv) {
      process.env.RESEND_API_KEY = originalEnv
    }
  })
})
