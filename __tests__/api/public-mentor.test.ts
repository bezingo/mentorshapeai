/**
 * Integration tests for Public Mentor Profile API
 * 
 * Tests cover:
 * - GET /api/public/mentor/[handle] - Fetch public mentor data
 * - Error handling for invalid handles
 * - Data aggregation (offers, badges, skills, stats)
 * 
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { GET } from '@/app/api/public/mentor/[handle]/route'
import { NextRequest } from 'next/server'

// Skip tests if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRunIntegrationTests)('Public Mentor Profile API', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testProfileId: string
  let testHandle: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Generate unique handle
    testHandle = `testmentor${Date.now()}`

    // Create a test user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: `test_clerk_public_${Date.now()}`,
        email: `test_public_${Date.now()}@example.com`,
      })
      .select()
      .single()

    if (userError) throw userError
    testUserId = userData.id

    // Create a test mentor profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId,
        display_name: 'Test Public Mentor',
        headline: 'Senior Software Engineer',
        bio: 'Experienced mentor with 10+ years helping developers grow.',
        public_handle: testHandle,
        is_mentor: true,
        country: 'United States',
        city: 'San Francisco',
        timezone: 'America/Los_Angeles',
        years_of_experience: 10,
        expertise_areas: ['Career Development', 'Technical Leadership'],
        languages: ['English', 'Spanish'],
        languages_spoken: ['English', 'Spanish'],
        can_mentor_for: ['Career Advice', 'Code Reviews'],
        specializations: ['React', 'Node.js', 'System Design'],
        mentor_onboarding_completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (profileError) throw profileError
    testProfileId = profileData.id

    // Create test skills
    await supabase.from('skills').insert([
      {
        profile_id: testProfileId,
        name: 'JavaScript',
        level: 5,
        is_public: true,
      },
      {
        profile_id: testProfileId,
        name: 'React',
        level: 4,
        is_public: true,
      },
      {
        profile_id: testProfileId,
        name: 'Secret Skill',
        level: 3,
        is_public: false, // Private skill
      },
    ])

    // Create test offers
    await supabase.from('mentor_offers').insert([
      {
        mentor_profile_id: testProfileId,
        type: 'free_collab',
        title: 'Free Career Chat',
        description: '30-minute career discussion',
        is_active: true,
        sort_order: 0,
      },
      {
        mentor_profile_id: testProfileId,
        type: 'paid_consult',
        title: 'Code Review Session',
        description: 'In-depth code review',
        price_cents: 5000,
        currency: 'usd',
        duration_minutes: 60,
        is_active: true,
        sort_order: 1,
      },
      {
        mentor_profile_id: testProfileId,
        type: 'paid_consult',
        title: 'Hidden Offer',
        description: 'This is inactive',
        price_cents: 10000,
        is_active: false, // Inactive - should not show
        sort_order: 2,
      },
    ])

    // Create test work experiences
    await supabase.from('work_experiences').insert([
      {
        profile_id: testProfileId,
        company: 'Tech Corp',
        title: 'Senior Engineer',
        start_date: '2020-01-01',
        end_date: null,
        description: 'Leading development teams',
        is_public: true,
        is_current: true,
      },
      {
        profile_id: testProfileId,
        company: 'Stealth Startup',
        title: 'CTO',
        start_date: '2018-01-01',
        end_date: '2019-12-31',
        description: 'Confidential work',
        is_public: false, // Private
        is_current: false,
      },
    ])

    // Create test education
    await supabase.from('educations').insert([
      {
        profile_id: testProfileId,
        institution: 'MIT',
        degree: 'B.S. Computer Science',
        start_date: '2010-09-01',
        end_date: '2014-05-15',
        is_public: true,
        is_current: false,
      },
    ])
  })

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testProfileId) {
      await supabase.from('mentor_offers').delete().eq('mentor_profile_id', testProfileId)
      await supabase.from('skills').delete().eq('profile_id', testProfileId)
      await supabase.from('work_experiences').delete().eq('profile_id', testProfileId)
      await supabase.from('educations').delete().eq('profile_id', testProfileId)
      await supabase.from('profiles').delete().eq('id', testProfileId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  // Helper to create request with params
  const createGETRequest = (handle: string) => {
    return new NextRequest(`http://localhost/api/public/mentor/${handle}`, {
      method: 'GET',
    })
  }

  // ============================================================
  // Basic Fetch Tests
  // ============================================================
  describe('GET /api/public/mentor/[handle]', () => {
    it('should return mentor profile data', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toBeDefined()
      expect(json.data.display_name).toBe('Test Public Mentor')
      expect(json.data.headline).toBe('Senior Software Engineer')
      expect(json.data.bio).toContain('Experienced mentor')
      expect(json.data.public_handle).toBe(testHandle)
    })

    it('should return 404 for non-existent handle', async () => {
      const response = await GET(
        createGETRequest('nonexistenthandle123'),
        { params: Promise.resolve({ handle: 'nonexistenthandle123' }) }
      )
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error.code).toBe('MENTOR_NOT_FOUND')
    })

    it('should return 400 for empty handle', async () => {
      const response = await GET(
        createGETRequest(''),
        { params: Promise.resolve({ handle: '' }) }
      )
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('HANDLE_REQUIRED')
    })
  })

  // ============================================================
  // Non-Mentor User Tests
  // ============================================================
  describe('Non-Mentor Users', () => {
    let nonMentorHandle: string
    let nonMentorProfileId: string
    let nonMentorUserId: string

    beforeAll(async () => {
      nonMentorHandle = `nonmentor${Date.now()}`
      
      // Create non-mentor user
      const { data: userData } = await supabase
        .from('users')
        .insert({
          clerk_user_id: `test_clerk_nonmentor_${Date.now()}`,
          email: `test_nonmentor_${Date.now()}@example.com`,
        })
        .select()
        .single()

      if (userData) {
        nonMentorUserId = userData.id

        const { data: profileData } = await supabase
          .from('profiles')
          .insert({
            user_id: nonMentorUserId,
            display_name: 'Non-Mentor User',
            public_handle: nonMentorHandle,
            is_mentor: false, // Not a mentor
          })
          .select()
          .single()

        if (profileData) {
          nonMentorProfileId = profileData.id
        }
      }
    })

    afterAll(async () => {
      if (nonMentorProfileId) {
        await supabase.from('profiles').delete().eq('id', nonMentorProfileId)
      }
      if (nonMentorUserId) {
        await supabase.from('users').delete().eq('id', nonMentorUserId)
      }
    })

    it('should return 404 for non-mentor user handle', async () => {
      const response = await GET(
        createGETRequest(nonMentorHandle),
        { params: Promise.resolve({ handle: nonMentorHandle }) }
      )
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error.code).toBe('NOT_A_MENTOR')
    })
  })

  // ============================================================
  // Aggregated Data Tests
  // ============================================================
  describe('Aggregated Data', () => {
    it('should include active offers only', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.offers).toBeDefined()
      expect(json.data.offers.length).toBe(2) // Only active offers
      
      // Verify no inactive offers
      const inactiveOffers = json.data.offers.filter(
        (o: any) => o.title === 'Hidden Offer'
      )
      expect(inactiveOffers.length).toBe(0)
    })

    it('should order offers by sort_order', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(json.data.offers[0].title).toBe('Free Career Chat')
      expect(json.data.offers[1].title).toBe('Code Review Session')
    })

    it('should include public skills only', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(json.data.skills).toBeDefined()
      expect(json.data.skills.length).toBe(2) // Only public skills
      
      // Verify no private skills
      const privateSkills = json.data.skills.filter(
        (s: any) => s.name === 'Secret Skill'
      )
      expect(privateSkills.length).toBe(0)
    })

    it('should include public work experiences only', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(json.data.work_experiences).toBeDefined()
      expect(json.data.work_experiences.length).toBe(1) // Only public work
      expect(json.data.work_experiences[0].company).toBe('Tech Corp')
    })

    it('should include public education only', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(json.data.education).toBeDefined()
      expect(json.data.education.length).toBe(1)
      expect(json.data.education[0].institution).toBe('MIT')
    })
  })

  // ============================================================
  // Profile Fields Tests
  // ============================================================
  describe('Profile Fields', () => {
    it('should include expertise areas', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(json.data.expertise_areas).toContain('Career Development')
      expect(json.data.expertise_areas).toContain('Technical Leadership')
    })

    it('should include languages', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(json.data.languages).toContain('English')
      expect(json.data.languages).toContain('Spanish')
    })

    it('should format location correctly', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(json.data.location).toBe('San Francisco, United States')
    })

    it('should include years of experience', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(json.data.years_of_experience).toBe(10)
    })

    it('should include mentor_since date', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(json.data.mentor_since).toBeDefined()
    })
  })

  // ============================================================
  // Stats Tests
  // ============================================================
  describe('Stats Calculation', () => {
    it('should include stats object', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(json.data.stats).toBeDefined()
      expect(json.data.stats).toHaveProperty('total_ratings')
      expect(json.data.stats).toHaveProperty('average_rating')
      expect(json.data.stats).toHaveProperty('total_collaborations')
    })

    it('should return null average_rating when no ratings', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      // No ratings created in test setup
      expect(json.data.stats.total_ratings).toBe(0)
      expect(json.data.stats.average_rating).toBeNull()
    })

    it('should return 0 collaborations when none exist', async () => {
      const response = await GET(
        createGETRequest(testHandle),
        { params: Promise.resolve({ handle: testHandle }) }
      )
      const json = await response.json()

      expect(json.data.stats.total_collaborations).toBe(0)
    })
  })

  // ============================================================
  // Empty Arrays Tests
  // ============================================================
  describe('Empty Arrays Handling', () => {
    let emptyHandle: string
    let emptyProfileId: string
    let emptyUserId: string

    beforeAll(async () => {
      emptyHandle = `emptymentor${Date.now()}`
      
      const { data: userData } = await supabase
        .from('users')
        .insert({
          clerk_user_id: `test_clerk_empty_${Date.now()}`,
          email: `test_empty_${Date.now()}@example.com`,
        })
        .select()
        .single()

      if (userData) {
        emptyUserId = userData.id

        const { data: profileData } = await supabase
          .from('profiles')
          .insert({
            user_id: emptyUserId,
            display_name: 'Empty Mentor',
            public_handle: emptyHandle,
            is_mentor: true,
            // No arrays populated
          })
          .select()
          .single()

        if (profileData) {
          emptyProfileId = profileData.id
        }
      }
    })

    afterAll(async () => {
      if (emptyProfileId) {
        await supabase.from('profiles').delete().eq('id', emptyProfileId)
      }
      if (emptyUserId) {
        await supabase.from('users').delete().eq('id', emptyUserId)
      }
    })

    it('should return empty arrays when no data exists', async () => {
      const response = await GET(
        createGETRequest(emptyHandle),
        { params: Promise.resolve({ handle: emptyHandle }) }
      )
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.offers).toEqual([])
      expect(json.data.skills).toEqual([])
      expect(json.data.badges).toEqual([])
      expect(json.data.work_experiences).toEqual([])
      expect(json.data.education).toEqual([])
      expect(json.data.expertise_areas).toEqual([])
    })
  })
})
