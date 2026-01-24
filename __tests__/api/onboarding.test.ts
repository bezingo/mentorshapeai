/**
 * Integration tests for Mentor Onboarding API
 * 
 * Tests cover:
 * - GET /api/mentor/onboarding - Fetch onboarding progress
 * - POST /api/mentor/onboarding - Initialize onboarding
 * - PATCH /api/mentor/onboarding - Update onboarding progress
 * 
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { GET, POST, PATCH } from '@/app/api/mentor/onboarding/route'
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
    getCurrentProfile: vi.fn(),
    requireAuth: vi.fn(),
  }
})

// Skip tests if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRunIntegrationTests)('Mentor Onboarding API', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testProfileId: string
  let testClerkUserId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create a test user
    testClerkUserId = `test_clerk_onboarding_${Date.now()}`
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: testClerkUserId,
        email: `test_onboarding_${Date.now()}@example.com`,
      })
      .select()
      .single()

    if (userError) throw userError
    testUserId = userData.id

    // Create a test profile (non-mentor)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId,
        display_name: 'Test Onboarding User',
        headline: 'Test Headline',
        is_mentor: false,
        bio: 'A'.repeat(60), // Pre-fill some bio
        languages_spoken: ['English'],
        can_mentor_for: ['Career Advice'],
        specializations: ['Software Engineering'],
        timezone: 'America/New_York',
      })
      .select()
      .single()

    if (profileError) throw profileError
    testProfileId = profileData.id
  })

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testProfileId) {
      await supabase.from('mentor_onboarding_progress').delete().eq('profile_id', testProfileId)
      await supabase.from('profiles').delete().eq('id', testProfileId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  beforeEach(async () => {
    // Clean up onboarding progress before each test
    if (testProfileId) {
      await supabase.from('mentor_onboarding_progress').delete().eq('profile_id', testProfileId)
    }

    // Reset mock
    const { getCurrentProfile, requireAuth } = await import('@/lib/clerk')
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(getCurrentProfile).mockResolvedValue({
      id: testProfileId,
      user_id: testUserId,
      display_name: 'Test Onboarding User',
      headline: 'Test Headline',
      is_mentor: false,
      bio: 'A'.repeat(60),
      languages_spoken: ['English'],
      can_mentor_for: ['Career Advice'],
      specializations: ['Software Engineering'],
      timezone: 'America/New_York',
      avatar_url: null,
      public_handle: null,
      phone: null,
      date_of_birth: null,
      gender: null,
      nationality: null,
      country: null,
      city: null,
      years_of_experience: null,
      completion_percentage: 0,
      traits_public: true,
      work_history_public: true,
      education_public: true,
      skills_public: true,
      is_mentee: true,
      want_to_learn: [],
      hobbies: [],
      expertise_areas: [],
      languages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
  })

  // ============================================================
  // GET /api/mentor/onboarding Tests
  // ============================================================
  describe('GET /api/mentor/onboarding', () => {
    it('should return 404 when onboarding has not started', async () => {
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error.code).toBe('ONBOARDING_NOT_STARTED')
    })

    it('should return onboarding progress when it exists', async () => {
      // Create onboarding progress first
      await supabase.from('mentor_onboarding_progress').insert({
        profile_id: testProfileId,
        current_step: 2,
        completed_steps: [1],
        form_data: { bio: 'Test bio' },
      })

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toBeDefined()
      expect(json.data.current_step).toBe(2)
      expect(json.data.completed_steps).toEqual([1])
      expect(json.data.form_data.bio).toBe('Test bio')
    })

    it('should return 409 when user is already a mentor', async () => {
      // Update profile to be a mentor
      await supabase.from('profiles').update({ is_mentor: true }).eq('id', testProfileId)

      const { getCurrentProfile } = await import('@/lib/clerk')
      vi.mocked(getCurrentProfile).mockResolvedValue({
        id: testProfileId,
        is_mentor: true,
      } as any)

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(409)
      expect(json.error.code).toBe('ONBOARDING_ALREADY_COMPLETE')

      // Reset
      await supabase.from('profiles').update({ is_mentor: false }).eq('id', testProfileId)
    })
  })

  // ============================================================
  // POST /api/mentor/onboarding Tests
  // ============================================================
  describe('POST /api/mentor/onboarding', () => {
    it('should initialize onboarding with pre-filled data from profile', async () => {
      const response = await POST()
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data).toBeDefined()
      expect(json.data.current_step).toBe(1)
      expect(json.data.completed_steps).toEqual([])
      
      // Check pre-filled form_data from profile
      expect(json.data.form_data.bio).toBeDefined()
      expect(json.data.form_data.languages).toContain('English')
      expect(json.data.form_data.expertise_areas).toContain('Career Advice')
      expect(json.data.form_data.skills).toContain('Software Engineering')
      expect(json.data.form_data.timezone).toBe('America/New_York')
    })

    it('should return 409 when onboarding already started', async () => {
      // Start onboarding first
      await supabase.from('mentor_onboarding_progress').insert({
        profile_id: testProfileId,
        current_step: 1,
        completed_steps: [],
        form_data: {},
      })

      const response = await POST()
      const json = await response.json()

      expect(response.status).toBe(409)
      expect(json.error.code).toBe('ONBOARDING_ALREADY_STARTED')
    })

    it('should return 409 when user is already a mentor', async () => {
      await supabase.from('profiles').update({ is_mentor: true }).eq('id', testProfileId)

      const { getCurrentProfile } = await import('@/lib/clerk')
      vi.mocked(getCurrentProfile).mockResolvedValue({
        id: testProfileId,
        is_mentor: true,
      } as any)

      const response = await POST()
      const json = await response.json()

      expect(response.status).toBe(409)
      expect(json.error.code).toBe('ONBOARDING_ALREADY_COMPLETE')

      // Reset
      await supabase.from('profiles').update({ is_mentor: false }).eq('id', testProfileId)
    })
  })

  // ============================================================
  // PATCH /api/mentor/onboarding Tests
  // ============================================================
  describe('PATCH /api/mentor/onboarding', () => {
    beforeEach(async () => {
      // Create onboarding progress before each PATCH test
      await supabase.from('mentor_onboarding_progress').insert({
        profile_id: testProfileId,
        current_step: 1,
        completed_steps: [],
        form_data: {},
      })
    })

    it('should update current_step', async () => {
      const request = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ current_step: 2 }),
      })

      const response = await PATCH(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.current_step).toBe(2)
    })

    it('should update completed_steps (merge with existing)', async () => {
      // First update with step 1 completed
      const request1 = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ completed_steps: [1] }),
      })
      await PATCH(request1)

      // Then update with step 2 completed
      const request2 = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ completed_steps: [2] }),
      })
      const response = await PATCH(request2)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.completed_steps).toContain(1)
      expect(json.data.completed_steps).toContain(2)
    })

    it('should merge form_data updates', async () => {
      // Update with bio
      const request1 = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          form_data: { bio: 'A'.repeat(60) },
        }),
      })
      await PATCH(request1)

      // Update with expertise_areas
      const request2 = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          form_data: { expertise_areas: ['Technical Interviews'] },
        }),
      })
      const response = await PATCH(request2)
      const json = await response.json()

      expect(response.status).toBe(200)
      // Both fields should be present
      expect(json.data.form_data.bio).toBeDefined()
      expect(json.data.form_data.expertise_areas).toContain('Technical Interviews')
    })

    it('should validate step data when marking step as complete', async () => {
      // Try to complete step 2 without proper data
      const request = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          completed_steps: [2],
          form_data: { bio: 'Too short' }, // Less than 50 chars
        }),
      })

      const response = await PATCH(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('STEP_VALIDATION_FAILED')
    })

    it('should allow completing step 2 with valid data', async () => {
      const request = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          completed_steps: [1, 2],
          form_data: {
            bio: 'A'.repeat(60),
            expertise_areas: ['Career Advice', 'Technical Interviews'],
          },
        }),
      })

      const response = await PATCH(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.completed_steps).toContain(2)
    })

    it('should return 404 when onboarding not started', async () => {
      // Delete onboarding progress
      await supabase.from('mentor_onboarding_progress').delete().eq('profile_id', testProfileId)

      const request = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ current_step: 2 }),
      })

      const response = await PATCH(request)
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error.code).toBe('ONBOARDING_NOT_STARTED')
    })

    it('should reject invalid current_step values', async () => {
      const request = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ current_step: 7 }),
      })

      const response = await PATCH(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject invalid form_data', async () => {
      const request = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          form_data: {
            bio: 'A'.repeat(1001), // Over 1000 char limit
          },
        }),
      })

      const response = await PATCH(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // ============================================================
  // Full Onboarding Flow Test
  // ============================================================
  describe('Complete Onboarding Flow', () => {
    it('should complete full onboarding lifecycle', async () => {
      // Step 1: Initialize onboarding
      const initResponse = await POST()
      expect(initResponse.status).toBe(201)

      // Step 2: Update with bio and expertise (Step 2)
      const step2Request = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          current_step: 2,
          completed_steps: [1],
          form_data: {
            bio: 'Experienced software engineer with 10 years of experience helping others grow.',
            expertise_areas: ['Career Advice', 'Technical Interviews'],
          },
        }),
      })
      const step2Response = await PATCH(step2Request)
      expect(step2Response.status).toBe(200)

      // Step 3: Update with skills and languages (Step 3)
      const step3Request = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          current_step: 3,
          completed_steps: [2],
          form_data: {
            skills: ['JavaScript', 'React', 'Node.js'],
            languages: ['English', 'Spanish'],
            timezone: 'America/New_York',
            years_of_experience: 10,
          },
        }),
      })
      const step3Response = await PATCH(step3Request)
      expect(step3Response.status).toBe(200)

      // Step 4: Update with availability (Step 4)
      const step4Request = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          current_step: 4,
          completed_steps: [3],
          form_data: {
            availability: [
              { day_of_week: 1, start_time: '09:00', end_time: '11:00' },
              { day_of_week: 3, start_time: '14:00', end_time: '16:00' },
            ],
          },
        }),
      })
      const step4Response = await PATCH(step4Request)
      expect(step4Response.status).toBe(200)

      // Step 5: Update with handle (Step 5)
      const step5Request = new NextRequest('http://localhost/api/mentor/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          current_step: 5,
          completed_steps: [4],
          form_data: {
            handle: `testmentor${Date.now()}`,
          },
        }),
      })
      const step5Response = await PATCH(step5Request)
      expect(step5Response.status).toBe(200)

      // Step 6: Final state check
      const finalResponse = await GET()
      const finalJson = await finalResponse.json()

      expect(finalJson.data.completed_steps).toContain(1)
      expect(finalJson.data.completed_steps).toContain(2)
      expect(finalJson.data.completed_steps).toContain(3)
      expect(finalJson.data.completed_steps).toContain(4)
      expect(finalJson.data.form_data.bio).toBeDefined()
      expect(finalJson.data.form_data.handle).toBeDefined()
    })
  })
})
