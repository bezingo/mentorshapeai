/**
 * Integration tests for Focus APIs
 *
 * Tests cover:
 * - GET /api/collaborations/[id]/focuses (list focuses)
 * - POST /api/collaborations/[id]/focuses (book focus)
 * - GET /api/focuses/[id] (get focus details)
 * - PATCH /api/focuses/[id] (update/reschedule/cancel focus)
 * - POST /api/focuses/[id]/complete (mark focus complete)
 *
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Mock Clerk authentication
vi.mock('@clerk/nextjs/server', () => ({
  getSession: vi.fn(),
  getAuthUserId: vi.fn(),
}))

vi.mock('@/lib/clerk', async () => {
  const actual = await vi.importActual('@/lib/clerk')
  return {
    ...actual,
    requireAuth: vi.fn(),
    ensureUserAndProfile: vi.fn(),
  }
})

// Skip tests if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRunIntegrationTests)('Focus API Integration Tests', () => {
  let supabase: SupabaseClient
  
  // Test entities
  let testMentorUserId: string
  let testMentorProfileId: string
  let testMenteeUserId: string
  let testMenteeProfileId: string
  let testGoalId: string
  let testCollaborationId: string
  let testFocusId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create test mentor
    const mentorClerkId = `test_mentor_focus_${Date.now()}`
    const { data: mentorUser, error: mentorUserError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: mentorClerkId,
        email: `mentor_focus_${Date.now()}@test.com`,
      })
      .select()
      .single()

    if (mentorUserError) throw mentorUserError
    testMentorUserId = mentorUser.id

    const { data: mentorProfile, error: mentorProfileError } = await supabase
      .from('profiles')
      .insert({
        user_id: testMentorUserId,
        display_name: 'Test Mentor Focus',
        is_mentor: true,
        is_mentee: false,
        timezone: 'America/New_York',
      })
      .select()
      .single()

    if (mentorProfileError) throw mentorProfileError
    testMentorProfileId = mentorProfile.id

    // Create test mentee
    const menteeClerkId = `test_mentee_focus_${Date.now()}`
    const { data: menteeUser, error: menteeUserError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: menteeClerkId,
        email: `mentee_focus_${Date.now()}@test.com`,
      })
      .select()
      .single()

    if (menteeUserError) throw menteeUserError
    testMenteeUserId = menteeUser.id

    const { data: menteeProfile, error: menteeProfileError } = await supabase
      .from('profiles')
      .insert({
        user_id: testMenteeUserId,
        display_name: 'Test Mentee Focus',
        is_mentor: false,
        is_mentee: true,
        timezone: 'America/Los_Angeles',
      })
      .select()
      .single()

    if (menteeProfileError) throw menteeProfileError
    testMenteeProfileId = menteeProfile.id

    // Create test goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        profile_id: testMenteeProfileId,
        title: 'Test Goal for Focus',
        description: 'Goal for testing focus functionality',
        status: 'active',
      })
      .select()
      .single()

    if (goalError) throw goalError
    testGoalId = goal.id

    // Create test collaboration (active status)
    const { data: collaboration, error: collaborationError } = await supabase
      .from('collaborations')
      .insert({
        goal_id: testGoalId,
        mentor_profile_id: testMentorProfileId,
        mentee_profile_id: testMenteeProfileId,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (collaborationError) throw collaborationError
    testCollaborationId = collaboration.id
  })

  afterAll(async () => {
    // Cleanup in reverse dependency order
    if (testFocusId) {
      await supabase.from('focus_agendas').delete().eq('focus_id', testFocusId)
      await supabase.from('focus_summaries').delete().eq('focus_id', testFocusId)
      await supabase.from('focuses').delete().eq('id', testFocusId)
    }
    if (testCollaborationId) {
      await supabase.from('collaborations').delete().eq('id', testCollaborationId)
    }
    if (testGoalId) {
      await supabase.from('goals').delete().eq('id', testGoalId)
    }
    if (testMenteeProfileId) {
      await supabase.from('profiles').delete().eq('id', testMenteeProfileId)
    }
    if (testMentorProfileId) {
      await supabase.from('profiles').delete().eq('id', testMentorProfileId)
    }
    if (testMenteeUserId) {
      await supabase.from('users').delete().eq('id', testMenteeUserId)
    }
    if (testMentorUserId) {
      await supabase.from('users').delete().eq('id', testMentorUserId)
    }
  })

  // ============================================================
  // POST /api/collaborations/[id]/focuses Tests
  // ============================================================
  describe('POST /api/collaborations/[id]/focuses', () => {
    beforeEach(async () => {
      // Mock as mentee
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee Focus',
        is_mentor: false,
        is_mentee: true,
      } as any)
    })

    it('should book a focus successfully', async () => {
      const { POST } = await import('@/app/api/collaborations/[id]/focuses/route')
      
      // Schedule 3 days from now to pass timing validation
      const scheduledAt = new Date()
      scheduledAt.setDate(scheduledAt.getDate() + 3)
      scheduledAt.setHours(14, 0, 0, 0)

      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}/focuses`, {
        method: 'POST',
        body: JSON.stringify({
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: 60,
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data).toBeDefined()
      expect(json.data.status).toBe('scheduled')
      expect(json.data.collaboration_id).toBe(testCollaborationId)
      expect(json.data.duration_minutes).toBe(60)

      testFocusId = json.data.id
    })

    it('should reject booking with less than minimum notice', async () => {
      const { POST } = await import('@/app/api/collaborations/[id]/focuses/route')
      
      // Schedule 1 hour from now (less than 2 hour minimum)
      const scheduledAt = new Date()
      scheduledAt.setHours(scheduledAt.getHours() + 1)

      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}/focuses`, {
        method: 'POST',
        body: JSON.stringify({
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: 60,
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('INVALID_BOOKING_TIME')
    })

    it('should reject booking beyond maximum advance days', async () => {
      const { POST } = await import('@/app/api/collaborations/[id]/focuses/route')
      
      // Schedule 65 days from now (beyond 60 day maximum)
      const scheduledAt = new Date()
      scheduledAt.setDate(scheduledAt.getDate() + 65)

      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}/focuses`, {
        method: 'POST',
        body: JSON.stringify({
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: 60,
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('INVALID_BOOKING_TIME')
    })

    it('should reject overlapping focus booking', async () => {
      const { POST } = await import('@/app/api/collaborations/[id]/focuses/route')
      
      // Get existing focus to find overlapping time
      const { data: existingFocus } = await supabase
        .from('focuses')
        .select('scheduled_at, duration_minutes')
        .eq('id', testFocusId)
        .single()

      // Try to book at same time
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}/focuses`, {
        method: 'POST',
        body: JSON.stringify({
          scheduled_at: existingFocus!.scheduled_at,
          duration_minutes: 60,
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(409)
      expect(json.error.code).toBe('FOCUS_CONFLICT')
    })

    it('should reject invalid duration', async () => {
      const { POST } = await import('@/app/api/collaborations/[id]/focuses/route')
      
      const scheduledAt = new Date()
      scheduledAt.setDate(scheduledAt.getDate() + 5)

      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}/focuses`, {
        method: 'POST',
        body: JSON.stringify({
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: 45, // Invalid - must be 30 or 60
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // ============================================================
  // GET /api/collaborations/[id]/focuses Tests
  // ============================================================
  describe('GET /api/collaborations/[id]/focuses', () => {
    beforeEach(async () => {
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee Focus',
        is_mentor: false,
        is_mentee: true,
      } as any)
    })

    it('should list focuses for collaboration', async () => {
      const { GET } = await import('@/app/api/collaborations/[id]/focuses/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}/focuses`)
      const response = await GET(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toBeDefined()
      expect(Array.isArray(json.data)).toBe(true)
      
      const focus = json.data.find((f: any) => f.id === testFocusId)
      expect(focus).toBeDefined()
    })

    it('should filter focuses by status', async () => {
      const { GET } = await import('@/app/api/collaborations/[id]/focuses/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}/focuses?status=scheduled`)
      const response = await GET(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(json.data)).toBe(true)
      
      for (const focus of json.data) {
        expect(focus.status).toBe('scheduled')
      }
    })

    it('should filter focuses by date range', async () => {
      const { GET } = await import('@/app/api/collaborations/[id]/focuses/route')
      
      const today = new Date().toISOString().split('T')[0]
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const futureDateStr = futureDate.toISOString().split('T')[0]

      const request = new NextRequest(
        `http://localhost/api/collaborations/${testCollaborationId}/focuses?from_date=${today}&to_date=${futureDateStr}`
      )
      const response = await GET(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(json.data)).toBe(true)
    })

    it('should reject unauthorized access', async () => {
      // Create another user not part of the collaboration
      const otherClerkId = `test_other_focus_${Date.now()}`
      const { data: otherUser } = await supabase
        .from('users')
        .insert({
          clerk_user_id: otherClerkId,
          email: `other_focus_${Date.now()}@test.com`,
        })
        .select()
        .single()

      const { data: otherProfile } = await supabase
        .from('profiles')
        .insert({
          user_id: otherUser!.id,
          display_name: 'Other User Focus',
        })
        .select()
        .single()

      // Mock as other user
      const { ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: otherProfile!.id,
        user_id: otherUser!.id,
        display_name: 'Other User Focus',
      } as any)

      const { GET } = await import('@/app/api/collaborations/[id]/focuses/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}/focuses`)
      const response = await GET(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')

      // Cleanup
      await supabase.from('profiles').delete().eq('id', otherProfile!.id)
      await supabase.from('users').delete().eq('id', otherUser!.id)
    })
  })

  // ============================================================
  // GET /api/focuses/[id] Tests
  // ============================================================
  describe('GET /api/focuses/[id]', () => {
    beforeEach(async () => {
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee Focus',
        is_mentor: false,
        is_mentee: true,
      } as any)
    })

    it('should get focus details', async () => {
      const { GET } = await import('@/app/api/focuses/[id]/route')
      
      const request = new NextRequest(`http://localhost/api/focuses/${testFocusId}`)
      const response = await GET(request, { params: Promise.resolve({ id: testFocusId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toBeDefined()
      expect(json.data.id).toBe(testFocusId)
      expect(json.data.collaboration_id).toBe(testCollaborationId)
      expect(json.data.user_role).toBe('mentee')
    })

    it('should return 404 for non-existent focus', async () => {
      const { GET } = await import('@/app/api/focuses/[id]/route')
      
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const request = new NextRequest(`http://localhost/api/focuses/${fakeId}`)
      const response = await GET(request, { params: Promise.resolve({ id: fakeId }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error.code).toBe('NOT_FOUND')
    })
  })

  // ============================================================
  // PATCH /api/focuses/[id] Tests
  // ============================================================
  describe('PATCH /api/focuses/[id]', () => {
    beforeEach(async () => {
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee Focus',
        is_mentor: false,
        is_mentee: true,
      } as any)
    })

    it('should reschedule a focus', async () => {
      const { PATCH } = await import('@/app/api/focuses/[id]/route')
      
      const newScheduledAt = new Date()
      newScheduledAt.setDate(newScheduledAt.getDate() + 7) // 7 days from now
      newScheduledAt.setHours(10, 0, 0, 0)

      const request = new NextRequest(`http://localhost/api/focuses/${testFocusId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scheduled_at: newScheduledAt.toISOString(),
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: testFocusId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toBeDefined()
      expect(new Date(json.data.scheduled_at).toISOString()).toBe(newScheduledAt.toISOString())
    })

    it('should update meeting URL', async () => {
      const { PATCH } = await import('@/app/api/focuses/[id]/route')
      
      const newMeetingUrl = 'https://zoom.us/j/updated123'

      const request = new NextRequest(`http://localhost/api/focuses/${testFocusId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          meeting_url: newMeetingUrl,
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: testFocusId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.meeting_url).toBe(newMeetingUrl)
    })

    it('should cancel a focus', async () => {
      const { PATCH } = await import('@/app/api/focuses/[id]/route')
      
      const request = new NextRequest(`http://localhost/api/focuses/${testFocusId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'cancelled',
          cancellation_reason: 'Schedule conflict with work',
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: testFocusId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.status).toBe('cancelled')
      expect(json.data.cancelled_at).toBeDefined()
    })

    it('should NOT allow rescheduling a cancelled focus', async () => {
      const { PATCH } = await import('@/app/api/focuses/[id]/route')
      
      const newScheduledAt = new Date()
      newScheduledAt.setDate(newScheduledAt.getDate() + 10)

      const request = new NextRequest(`http://localhost/api/focuses/${testFocusId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scheduled_at: newScheduledAt.toISOString(),
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: testFocusId }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('CANNOT_RESCHEDULE')
    })
  })

  // ============================================================
  // POST /api/focuses/[id]/complete Tests
  // ============================================================
  describe('POST /api/focuses/[id]/complete', () => {
    let activeFocusId: string

    beforeAll(async () => {
      // Create a new focus that's in_progress for completion testing
      const scheduledAt = new Date()
      scheduledAt.setDate(scheduledAt.getDate() + 4)
      
      const { data: focus, error } = await supabase
        .from('focuses')
        .insert({
          collaboration_id: testCollaborationId,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: 60,
          status: 'in_progress',
        })
        .select()
        .single()

      if (error) throw error
      activeFocusId = focus.id
    })

    afterAll(async () => {
      if (activeFocusId) {
        await supabase.from('focuses').delete().eq('id', activeFocusId)
      }
    })

    beforeEach(async () => {
      // Mock as mentor (typically completes focuses)
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMentorProfileId,
        user_id: testMentorUserId,
        display_name: 'Test Mentor Focus',
        is_mentor: true,
      } as any)
    })

    it('should complete a focus successfully', async () => {
      const { POST } = await import('@/app/api/focuses/[id]/complete/route')
      
      const request = new NextRequest(`http://localhost/api/focuses/${activeFocusId}/complete`, {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: activeFocusId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.status).toBe('completed')
      expect(json.data.completed_at).toBeDefined()
    })

    it('should NOT complete an already completed focus', async () => {
      const { POST } = await import('@/app/api/focuses/[id]/complete/route')
      
      const request = new NextRequest(`http://localhost/api/focuses/${activeFocusId}/complete`, {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: activeFocusId }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('INVALID_STATUS')
    })

    it('should NOT complete a cancelled focus', async () => {
      // Use the cancelled focus from earlier tests
      const { POST } = await import('@/app/api/focuses/[id]/complete/route')
      
      const request = new NextRequest(`http://localhost/api/focuses/${testFocusId}/complete`, {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: testFocusId }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('INVALID_STATUS')
    })
  })

  // ============================================================
  // Error Handling Tests
  // ============================================================
  describe('Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const { requireAuth } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))

      const { GET } = await import('@/app/api/collaborations/[id]/focuses/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}/focuses`)
      const response = await GET(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 400 for invalid datetime format', async () => {
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee Focus',
      } as any)

      const { POST } = await import('@/app/api/collaborations/[id]/focuses/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}/focuses`, {
        method: 'POST',
        body: JSON.stringify({
          scheduled_at: '2026-02-01 14:00:00', // Invalid - not ISO 8601
          duration_minutes: 60,
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
