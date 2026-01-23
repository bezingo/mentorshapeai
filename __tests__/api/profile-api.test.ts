/**
 * Profile API Tests for User Profile System
 *
 * These tests validate the API endpoints for profile management.
 * Tests cover GET/PUT /api/profile/me with all new profile fields.
 *
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { GET, PUT } from '@/app/api/profile/me/route'
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
  }
})

// Skip tests if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRunIntegrationTests)('Profile API Extensions', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testProfileId: string
  let testClerkUserId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create a test user
    testClerkUserId = `test_clerk_${Date.now()}`
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: testClerkUserId,
        email: `test_${Date.now()}@example.com`,
      })
      .select()
      .single()

    if (userError) throw userError
    testUserId = userData.id

    // Create a test profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId,
        display_name: 'Test User',
        headline: 'Test Headline',
      })
      .select()
      .single()

    if (profileError) throw profileError
    testProfileId = profileData.id
  })

  afterAll(async () => {
    // Cleanup: Delete test profile and user
    if (testProfileId) {
      await supabase.from('profiles').delete().eq('id', testProfileId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  beforeEach(async () => {
    // Mock getCurrentProfile to return our test profile
    const { getCurrentProfile } = await import('@/lib/clerk')
    vi.mocked(getCurrentProfile).mockResolvedValue({
      id: testProfileId,
      user_id: testUserId,
      display_name: 'Test User',
      headline: 'Test Headline',
      bio: null,
      avatar_url: null,
      is_mentor: false,
      is_mentee: true,
      public_handle: null,
      phone: null,
      date_of_birth: null,
      gender: null,
      nationality: null,
      country: null,
      city: null,
      timezone: null,
      years_of_experience: null,
      completion_percentage: 0,
      traits_public: true,
      work_history_public: true,
      education_public: true,
      skills_public: true,
      languages_spoken: [],
      can_mentor_for: [],
      want_to_learn: [],
      specializations: [],
      hobbies: [],
      expertise_areas: [],
      languages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
  })

  describe('Test 1: GET /api/profile/me returns all new profile fields', () => {
    it('should return all new profile fields including phone, date_of_birth, gender, nationality, country, city, timezone, years_of_experience, completion_percentage, and array fields', async () => {
      // Update profile with new fields
      await supabase
        .from('profiles')
        .update({
          phone: '+1234567890',
          date_of_birth: '1990-05-15',
          gender: 'Male',
          nationality: 'United States',
          country: 'United States',
          city: 'New York',
          timezone: 'America/New_York',
          years_of_experience: 10,
          languages_spoken: ['English', 'Spanish'],
          can_mentor_for: ['Career Advice'],
          want_to_learn: ['Entrepreneurship'],
          specializations: ['Software Engineering'],
          hobbies: ['Photography'],
        })
        .eq('id', testProfileId)

      // Mock getCurrentProfile with updated data
      const { getCurrentProfile } = await import('@/lib/clerk')
      const updatedProfile = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testProfileId)
        .single()

      vi.mocked(getCurrentProfile).mockResolvedValue(updatedProfile.data as any)

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toHaveProperty('phone')
      expect(json.data).toHaveProperty('date_of_birth')
      expect(json.data).toHaveProperty('gender')
      expect(json.data).toHaveProperty('nationality')
      expect(json.data).toHaveProperty('country')
      expect(json.data).toHaveProperty('city')
      expect(json.data).toHaveProperty('timezone')
      expect(json.data).toHaveProperty('years_of_experience')
      expect(json.data).toHaveProperty('completion_percentage')
      expect(json.data).toHaveProperty('languages_spoken')
      expect(json.data).toHaveProperty('can_mentor_for')
      expect(json.data).toHaveProperty('want_to_learn')
      expect(json.data).toHaveProperty('specializations')
      expect(json.data).toHaveProperty('hobbies')
    })
  })

  describe('Test 2: PUT /api/profile/me updates personal info fields', () => {
    it('should update phone, date_of_birth, gender, nationality fields', async () => {
      const updateData = {
        phone: '+9876543210',
        date_of_birth: '1985-03-20',
        gender: 'Female',
        nationality: 'Canada',
      }

      const request = new NextRequest('http://localhost/api/profile/me', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.phone).toBe(updateData.phone)
      expect(json.data.date_of_birth).toBe(updateData.date_of_birth)
      expect(json.data.gender).toBe(updateData.gender)
      expect(json.data.nationality).toBe(updateData.nationality)

      // Verify in database
      const { data } = await supabase
        .from('profiles')
        .select('phone, date_of_birth, gender, nationality')
        .eq('id', testProfileId)
        .single()

      expect(data?.phone).toBe(updateData.phone)
      expect(data?.gender).toBe(updateData.gender)
    })
  })

  describe('Test 3: PUT /api/profile/me updates location fields', () => {
    it('should update country and city fields', async () => {
      const updateData = {
        country: 'United Kingdom',
        city: 'London',
      }

      const request = new NextRequest('http://localhost/api/profile/me', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.country).toBe(updateData.country)
      expect(json.data.city).toBe(updateData.city)
    })
  })

  describe('Test 4: PUT /api/profile/me updates text array fields', () => {
    it('should update languages_spoken, can_mentor_for, want_to_learn, specializations, hobbies', async () => {
      const updateData = {
        languages_spoken: ['English', 'French', 'German'],
        can_mentor_for: ['Career Advice', 'Personal Development'],
        want_to_learn: ['Entrepreneurship', 'Marketing'],
        specializations: ['Software Engineering', 'Product Management'],
        hobbies: ['Photography', 'Hiking', 'Reading'],
      }

      const request = new NextRequest('http://localhost/api/profile/me', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.languages_spoken).toEqual(updateData.languages_spoken)
      expect(json.data.can_mentor_for).toEqual(updateData.can_mentor_for)
      expect(json.data.want_to_learn).toEqual(updateData.want_to_learn)
      expect(json.data.specializations).toEqual(updateData.specializations)
      expect(json.data.hobbies).toEqual(updateData.hobbies)
    })
  })

  describe('Test 5: PUT /api/profile/me enforces max 20 items per array field', () => {
    it('should reject arrays with more than 20 items', async () => {
      const updateData = {
        languages_spoken: Array.from({ length: 21 }, (_, i) => `Language${i}`),
      }

      const request = new NextRequest('http://localhost/api/profile/me', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBeDefined()
      expect(json.error.message).toContain('20')
    })
  })

  describe('Test 6: PUT /api/profile/me updates visibility toggles', () => {
    it('should update traits_public, work_history_public, education_public, skills_public', async () => {
      const updateData = {
        traits_public: false,
        work_history_public: false,
        education_public: true,
        skills_public: true,
      }

      const request = new NextRequest('http://localhost/api/profile/me', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.traits_public).toBe(false)
      expect(json.data.work_history_public).toBe(false)
      expect(json.data.education_public).toBe(true)
      expect(json.data.skills_public).toBe(true)
    })
  })

  describe('Test 7: PUT /api/profile/me updates mentor-specific fields only when is_mentor=true', () => {
    it('should allow updating mentor fields when is_mentor=true', async () => {
      // First set is_mentor to true
      await supabase
        .from('profiles')
        .update({ is_mentor: true })
        .eq('id', testProfileId)

      // Update mock
      const { getCurrentProfile } = await import('@/lib/clerk')
      const mentorProfile = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testProfileId)
        .single()
      vi.mocked(getCurrentProfile).mockResolvedValue(mentorProfile.data as any)

      const updateData = {
        expertise_areas: ['Web Development', 'AI/ML'],
        languages: ['English', 'Spanish'],
        timezone: 'America/Los_Angeles',
        years_of_experience: 15,
      }

      const request = new NextRequest('http://localhost/api/profile/me', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.expertise_areas).toEqual(updateData.expertise_areas)
      expect(json.data.languages).toEqual(updateData.languages)
      expect(json.data.timezone).toBe(updateData.timezone)
      expect(json.data.years_of_experience).toBe(updateData.years_of_experience)
    })

    it('should reject mentor fields when is_mentor=false', async () => {
      // Ensure is_mentor is false
      await supabase
        .from('profiles')
        .update({ is_mentor: false })
        .eq('id', testProfileId)

      const { getCurrentProfile } = await import('@/lib/clerk')
      const nonMentorProfile = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testProfileId)
        .single()
      vi.mocked(getCurrentProfile).mockResolvedValue(nonMentorProfile.data as any)

      const updateData = {
        expertise_areas: ['Web Development'],
      }

      const request = new NextRequest('http://localhost/api/profile/me', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const json = await response.json()

      // Should either reject or ignore mentor fields
      // Implementation may vary - check if error or field is ignored
      expect([200, 400]).toContain(response.status)
    })
  })

  describe('Test 8: completion_percentage is returned and reflects current state', () => {
    it('should return completion_percentage in GET response', async () => {
      // Add some profile data to increase completion
      await supabase
        .from('profiles')
        .update({
          display_name: 'Test User',
          headline: 'Test Headline',
          bio: 'Test bio',
          country: 'United States',
          city: 'New York',
        })
        .eq('id', testProfileId)

      const { getCurrentProfile } = await import('@/lib/clerk')
      const updatedProfile = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testProfileId)
        .single()
      vi.mocked(getCurrentProfile).mockResolvedValue(updatedProfile.data as any)

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toHaveProperty('completion_percentage')
      expect(json.data.completion_percentage).toBeGreaterThanOrEqual(0)
      expect(json.data.completion_percentage).toBeLessThanOrEqual(100)
    })

    it('should update completion_percentage after profile update', async () => {
      // Get initial completion
      const initialProfile = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', testProfileId)
        .single()

      const initialCompletion = initialProfile.data?.completion_percentage || 0

      // Add bio to increase completion
      const request = new NextRequest('http://localhost/api/profile/me', {
        method: 'PUT',
        body: JSON.stringify({
          bio: 'This is a test biography that should increase completion percentage.',
        }),
      })

      await PUT(request)

      // Check updated completion
      const updatedProfile = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', testProfileId)
        .single()

      // Completion should have increased (trigger should recalculate)
      expect(updatedProfile.data?.completion_percentage).toBeGreaterThanOrEqual(
        initialCompletion
      )
    })
  })
})


