/**
 * Integration tests for Collaboration APIs
 *
 * Tests cover:
 * - GET /api/collaborations (list collaborations)
 * - POST /api/collaborations (create collaboration request)
 * - GET /api/collaborations/[id] (get collaboration details)
 * - PATCH /api/collaborations/[id] (update collaboration status)
 * - DELETE /api/collaborations/[id] (cancel collaboration)
 *
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Mock Clerk authentication
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
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

describe.skipIf(!shouldRunIntegrationTests)('Collaboration API Integration Tests', () => {
  let supabase: SupabaseClient
  
  // Test entities
  let testMentorUserId: string
  let testMentorProfileId: string
  let testMenteeUserId: string
  let testMenteeProfileId: string
  let testGoalId: string
  let testCollaborationId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create test mentor user and profile
    const mentorClerkId = `test_mentor_${Date.now()}`
    const { data: mentorUser, error: mentorUserError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: mentorClerkId,
        email: `mentor_${Date.now()}@test.com`,
      })
      .select()
      .single()

    if (mentorUserError) throw mentorUserError
    testMentorUserId = mentorUser.id

    const { data: mentorProfile, error: mentorProfileError } = await supabase
      .from('profiles')
      .insert({
        user_id: testMentorUserId,
        display_name: 'Test Mentor',
        is_mentor: true,
        is_mentee: false,
      })
      .select()
      .single()

    if (mentorProfileError) throw mentorProfileError
    testMentorProfileId = mentorProfile.id

    // Create test mentee user and profile
    const menteeClerkId = `test_mentee_${Date.now()}`
    const { data: menteeUser, error: menteeUserError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: menteeClerkId,
        email: `mentee_${Date.now()}@test.com`,
      })
      .select()
      .single()

    if (menteeUserError) throw menteeUserError
    testMenteeUserId = menteeUser.id

    const { data: menteeProfile, error: menteeProfileError } = await supabase
      .from('profiles')
      .insert({
        user_id: testMenteeUserId,
        display_name: 'Test Mentee',
        is_mentor: false,
        is_mentee: true,
      })
      .select()
      .single()

    if (menteeProfileError) throw menteeProfileError
    testMenteeProfileId = menteeProfile.id

    // Create test goal for mentee
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        profile_id: testMenteeProfileId,
        title: 'Test Goal for Collaboration',
        description: 'A test goal to be used in collaboration tests',
        status: 'active',
      })
      .select()
      .single()

    if (goalError) throw goalError
    testGoalId = goal.id
  })

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
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
  // POST /api/collaborations Tests
  // ============================================================
  describe('POST /api/collaborations', () => {
    beforeEach(async () => {
      // Mock as mentee for creating collaboration requests
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee',
        is_mentor: false,
        is_mentee: true,
      } as any)
    })

    it('should create a collaboration request successfully', async () => {
      const { POST } = await import('@/app/api/collaborations/route')
      
      const request = new NextRequest('http://localhost/api/collaborations', {
        method: 'POST',
        body: JSON.stringify({
          goal_id: testGoalId,
          mentor_profile_id: testMentorProfileId,
          request_message: 'I would like your guidance on my career goals.',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data).toBeDefined()
      expect(json.data.status).toBe('pending')
      expect(json.data.goal_id).toBe(testGoalId)
      expect(json.data.mentor_profile_id).toBe(testMentorProfileId)
      expect(json.data.mentee_profile_id).toBe(testMenteeProfileId)
      expect(json.data.user_role).toBe('mentee')

      // Store for later tests
      testCollaborationId = json.data.id
    })

    it('should reject collaboration with self', async () => {
      const { ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMentorProfileId, // Same as mentor
        user_id: testMentorUserId,
        display_name: 'Test Mentor',
        is_mentor: true,
      } as any)

      const { POST } = await import('@/app/api/collaborations/route')
      
      const request = new NextRequest('http://localhost/api/collaborations', {
        method: 'POST',
        body: JSON.stringify({
          goal_id: testGoalId,
          mentor_profile_id: testMentorProfileId, // Same profile
          request_message: 'Self collaboration attempt',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('SELF_COLLABORATION')
    })

    it('should reject if mentor is not a mentor', async () => {
      // Reset mock to mentee context
      const { ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee',
        is_mentor: false,
        is_mentee: true,
      } as any)

      // Temporarily update mentor profile to not be a mentor
      await supabase
        .from('profiles')
        .update({ is_mentor: false })
        .eq('id', testMentorProfileId)

      const { POST } = await import('@/app/api/collaborations/route')
      
      const request = new NextRequest('http://localhost/api/collaborations', {
        method: 'POST',
        body: JSON.stringify({
          goal_id: testGoalId,
          mentor_profile_id: testMentorProfileId,
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('NOT_A_MENTOR')

      // Restore mentor profile
      await supabase
        .from('profiles')
        .update({ is_mentor: true })
        .eq('id', testMentorProfileId)
    })

    it('should reject duplicate pending collaboration', async () => {
      // Reset mock
      const { ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee',
        is_mentor: false,
        is_mentee: true,
      } as any)

      const { POST } = await import('@/app/api/collaborations/route')
      
      // Try to create another collaboration for the same goal/mentor
      const request = new NextRequest('http://localhost/api/collaborations', {
        method: 'POST',
        body: JSON.stringify({
          goal_id: testGoalId,
          mentor_profile_id: testMentorProfileId,
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(409)
      expect(json.error.code).toBe('COLLABORATION_EXISTS')
    })
  })

  // ============================================================
  // GET /api/collaborations Tests
  // ============================================================
  describe('GET /api/collaborations', () => {
    beforeEach(async () => {
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee',
        is_mentor: false,
        is_mentee: true,
      } as any)
    })

    it('should list collaborations for mentee', async () => {
      const { GET } = await import('@/app/api/collaborations/route')
      
      const request = new NextRequest('http://localhost/api/collaborations')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toBeDefined()
      expect(Array.isArray(json.data)).toBe(true)
      
      const collaboration = json.data.find((c: any) => c.id === testCollaborationId)
      expect(collaboration).toBeDefined()
      expect(collaboration.user_role).toBe('mentee')
    })

    it('should filter collaborations by as_mentee', async () => {
      const { GET } = await import('@/app/api/collaborations/route')
      
      const request = new NextRequest('http://localhost/api/collaborations?as_mentee=true')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(json.data)).toBe(true)
      
      // All returned collaborations should have user_role = 'mentee'
      for (const collab of json.data) {
        expect(collab.user_role).toBe('mentee')
      }
    })

    it('should filter collaborations by status', async () => {
      const { GET } = await import('@/app/api/collaborations/route')
      
      const request = new NextRequest('http://localhost/api/collaborations?status=pending')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(json.data)).toBe(true)
      
      // All returned collaborations should have status = 'pending'
      for (const collab of json.data) {
        expect(collab.status).toBe('pending')
      }
    })

    it('should list collaborations for mentor', async () => {
      // Switch to mentor context
      const { ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMentorProfileId,
        user_id: testMentorUserId,
        display_name: 'Test Mentor',
        is_mentor: true,
        is_mentee: false,
      } as any)

      const { GET } = await import('@/app/api/collaborations/route')
      
      const request = new NextRequest('http://localhost/api/collaborations?as_mentor=true')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(json.data)).toBe(true)
      
      const collaboration = json.data.find((c: any) => c.id === testCollaborationId)
      expect(collaboration).toBeDefined()
      expect(collaboration.user_role).toBe('mentor')
    })
  })

  // ============================================================
  // PATCH /api/collaborations/[id] Tests
  // ============================================================
  describe('PATCH /api/collaborations/[id]', () => {
    it('should allow mentor to accept collaboration', async () => {
      // Mock as mentor
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMentorProfileId,
        user_id: testMentorUserId,
        display_name: 'Test Mentor',
        is_mentor: true,
      } as any)

      const { PATCH } = await import('@/app/api/collaborations/[id]/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'accepted',
          response_message: 'I would be happy to help you!',
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.status).toBe('accepted')
      expect(json.data.response_message).toBe('I would be happy to help you!')
    })

    it('should allow mentor to mark as active', async () => {
      // Mock as mentor
      const { ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMentorProfileId,
        user_id: testMentorUserId,
        display_name: 'Test Mentor',
        is_mentor: true,
      } as any)

      const { PATCH } = await import('@/app/api/collaborations/[id]/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.status).toBe('active')
      expect(json.data.started_at).toBeDefined()
    })

    it('should NOT allow mentee to accept collaboration', async () => {
      // First reset status to pending
      await supabase
        .from('collaborations')
        .update({ status: 'pending' })
        .eq('id', testCollaborationId)

      // Mock as mentee
      const { ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee',
        is_mentee: true,
      } as any)

      const { PATCH } = await import('@/app/api/collaborations/[id]/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'accepted' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('INVALID_TRANSITION')
    })

    it('should reject invalid status transition', async () => {
      // Set status to completed (terminal)
      await supabase
        .from('collaborations')
        .update({ status: 'completed' })
        .eq('id', testCollaborationId)

      // Mock as mentor
      const { ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMentorProfileId,
        user_id: testMentorUserId,
        display_name: 'Test Mentor',
        is_mentor: true,
      } as any)

      const { PATCH } = await import('@/app/api/collaborations/[id]/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('INVALID_TRANSITION')

      // Reset for other tests
      await supabase
        .from('collaborations')
        .update({ status: 'active' })
        .eq('id', testCollaborationId)
    })
  })

  // ============================================================
  // DELETE /api/collaborations/[id] Tests
  // ============================================================
  describe('DELETE /api/collaborations/[id]', () => {
    it('should allow mentee to cancel collaboration', async () => {
      // Mock as mentee
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee',
        is_mentee: true,
      } as any)

      const { DELETE } = await import('@/app/api/collaborations/[id]/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          reason: 'I found another mentor who is a better fit.',
        }),
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.status).toBe('cancelled')
      expect(json.data.cancelled_at).toBeDefined()
    })

    it('should NOT allow cancelling already cancelled collaboration', async () => {
      // Mock as mentee
      const { ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee',
        is_mentee: true,
      } as any)

      const { DELETE } = await import('@/app/api/collaborations/[id]/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('INVALID_TRANSITION')
    })

    it('should reject unauthorized users from cancelling', async () => {
      // Create another user not part of the collaboration
      const otherClerkId = `test_other_${Date.now()}`
      const { data: otherUser } = await supabase
        .from('users')
        .insert({
          clerk_user_id: otherClerkId,
          email: `other_${Date.now()}@test.com`,
        })
        .select()
        .single()

      const { data: otherProfile } = await supabase
        .from('profiles')
        .insert({
          user_id: otherUser!.id,
          display_name: 'Other User',
        })
        .select()
        .single()

      // Mock as other user
      const { ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: otherProfile!.id,
        user_id: otherUser!.id,
        display_name: 'Other User',
      } as any)

      const { DELETE } = await import('@/app/api/collaborations/[id]/route')
      
      const request = new NextRequest(`http://localhost/api/collaborations/${testCollaborationId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: testCollaborationId }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')

      // Cleanup
      await supabase.from('profiles').delete().eq('id', otherProfile!.id)
      await supabase.from('users').delete().eq('id', otherUser!.id)
    })
  })

  // ============================================================
  // Error Handling Tests
  // ============================================================
  describe('Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const { requireAuth } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))

      const { GET } = await import('@/app/api/collaborations/route')
      
      const request = new NextRequest('http://localhost/api/collaborations')
      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 404 for non-existent collaboration', async () => {
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee',
      } as any)

      const { GET } = await import('@/app/api/collaborations/[id]/route')
      
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const request = new NextRequest(`http://localhost/api/collaborations/${fakeId}`)
      const response = await GET(request, { params: Promise.resolve({ id: fakeId }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('should return 400 for invalid request body', async () => {
      const { requireAuth, ensureUserAndProfile } = await import('@/lib/clerk')
      vi.mocked(requireAuth).mockResolvedValue(undefined as any)
      vi.mocked(ensureUserAndProfile).mockResolvedValue({
        id: testMenteeProfileId,
        user_id: testMenteeUserId,
        display_name: 'Test Mentee',
      } as any)

      const { POST } = await import('@/app/api/collaborations/route')
      
      const request = new NextRequest('http://localhost/api/collaborations', {
        method: 'POST',
        body: JSON.stringify({
          goal_id: 'not-a-uuid', // Invalid
          mentor_profile_id: testMentorProfileId,
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
