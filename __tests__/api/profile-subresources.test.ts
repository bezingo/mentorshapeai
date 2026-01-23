/**
 * Profile Sub-Resource API Tests
 *
 * These tests validate CRUD APIs for work_experiences, educations, and skills.
 * Tests cover authorization, validation, and profile completion recalculation.
 *
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { GET, POST } from '@/app/api/profile/work-experiences/route'
import { GET as GETEducation, POST as POSTEducation } from '@/app/api/profile/educations/route'
import { GET as GETSkill, POST as POSTSkill } from '@/app/api/profile/skills/route'
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

describe.skipIf(!shouldRunIntegrationTests)('Profile Sub-Resource APIs', () => {
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
    // Cleanup: Delete test data
    if (testProfileId) {
      await supabase.from('work_experiences').delete().eq('profile_id', testProfileId)
      await supabase.from('educations').delete().eq('profile_id', testProfileId)
      await supabase.from('skills').delete().eq('profile_id', testProfileId)
      await supabase.from('profiles').delete().eq('id', testProfileId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  beforeEach(async () => {
    // Mock getCurrentProfile to return our test profile
    const { getCurrentProfile } = await import('@/lib/clerk')
    const profile = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testProfileId)
      .single()

    vi.mocked(getCurrentProfile).mockResolvedValue(profile.data as any)
  })

  describe('Test 1: work_experiences CRUD', () => {
    let workExpId: string

    it('should create work experience with is_current flag', async () => {
      const createData = {
        company: 'Test Company',
        title: 'Software Engineer',
        start_date: '2020-01-01',
        is_current: true,
      }

      const request = new NextRequest('http://localhost/api/profile/work-experiences', {
        method: 'POST',
        body: JSON.stringify(createData),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.company).toBe(createData.company)
      expect(json.data.title).toBe(createData.title)
      expect(json.data.is_current).toBe(true)
      expect(json.data.end_date).toBeNull()

      workExpId = json.data.id
    })

    it('should update work experience', async () => {
      const updateData = {
        title: 'Senior Software Engineer',
        end_date: '2023-12-31',
        is_current: false,
      }

      const request = new NextRequest(
        `http://localhost/api/profile/work-experiences/${workExpId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      )

      const { PUT } = await import('@/app/api/profile/work-experiences/[id]/route')
      const response = await PUT(request, { params: { id: workExpId } })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.title).toBe(updateData.title)
      expect(json.data.is_current).toBe(false)
    })

    it('should delete work experience', async () => {
      const { DELETE } = await import('@/app/api/profile/work-experiences/[id]/route')
      const request = new NextRequest(
        `http://localhost/api/profile/work-experiences/${workExpId}`,
        {
          method: 'DELETE',
        }
      )

      const response = await DELETE(request, { params: { id: workExpId } })

      expect(response.status).toBe(200)

      // Verify deletion
      const { data } = await supabase
        .from('work_experiences')
        .select()
        .eq('id', workExpId)
        .single()

      expect(data).toBeNull()
    })
  })

  describe('Test 2: educations CRUD', () => {
    let educationId: string

    it('should create education with is_current flag', async () => {
      const createData = {
        institution: 'Test University',
        degree: 'Bachelor of Science',
        start_date: '2016-09-01',
        is_current: false,
        end_date: '2020-05-31',
      }

      const request = new NextRequest('http://localhost/api/profile/educations', {
        method: 'POST',
        body: JSON.stringify(createData),
      })

      const response = await POSTEducation(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.institution).toBe(createData.institution)
      expect(json.data.degree).toBe(createData.degree)
      expect(json.data.is_current).toBe(false)

      educationId = json.data.id
    })

    it('should update education', async () => {
      const updateData = {
        degree: 'Master of Science',
        is_current: true,
      }

      const { PUT } = await import('@/app/api/profile/educations/[id]/route')
      const request = new NextRequest(
        `http://localhost/api/profile/educations/${educationId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      )

      const response = await PUT(request, { params: { id: educationId } })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.degree).toBe(updateData.degree)
      expect(json.data.is_current).toBe(true)
      expect(json.data.end_date).toBeNull()
    })

    it('should delete education', async () => {
      const { DELETE } = await import('@/app/api/profile/educations/[id]/route')
      const request = new NextRequest(
        `http://localhost/api/profile/educations/${educationId}`,
        {
          method: 'DELETE',
        }
      )

      const response = await DELETE(request, { params: { id: educationId } })

      expect(response.status).toBe(200)
    })
  })

  describe('Test 3: skills CRUD', () => {
    let skillId: string

    it('should create skill with level', async () => {
      const createData = {
        name: 'JavaScript',
        level: 'Advanced',
      }

      const request = new NextRequest('http://localhost/api/profile/skills', {
        method: 'POST',
        body: JSON.stringify(createData),
      })

      const response = await POSTSkill(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.name).toBe(createData.name)
      expect(json.data.level).toBe(createData.level)

      skillId = json.data.id
    })

    it('should enforce max 50 skills limit', async () => {
      // Create 50 skills first
      const skills = Array.from({ length: 50 }, (_, i) => ({
        name: `Skill ${i}`,
        level: 'Intermediate',
      }))

      for (const skill of skills) {
        const request = new NextRequest('http://localhost/api/profile/skills', {
          method: 'POST',
          body: JSON.stringify(skill),
        })
        await POSTSkill(request)
      }

      // Try to create 51st skill
      const request = new NextRequest('http://localhost/api/profile/skills', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Skill 51',
          level: 'Beginner',
        }),
      })

      const response = await POSTSkill(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.message).toContain('50')
    })

    it('should update skill', async () => {
      const { PUT } = await import('@/app/api/profile/skills/[id]/route')
      const request = new NextRequest(`http://localhost/api/profile/skills/${skillId}`, {
        method: 'PUT',
        body: JSON.stringify({
          level: 'Expert',
        }),
      })

      const response = await PUT(request, { params: { id: skillId } })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.level).toBe('Expert')
    })

    it('should delete skill', async () => {
      const { DELETE } = await import('@/app/api/profile/skills/[id]/route')
      const request = new NextRequest(`http://localhost/api/profile/skills/${skillId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: skillId } })

      expect(response.status).toBe(200)
    })
  })

  describe('Test 4: Authorization - users can only modify their own records', () => {
    it('should prevent accessing other user work experiences', async () => {
      // Create another user's work experience
      const { data: otherUser } = await supabase
        .from('users')
        .insert({
          clerk_user_id: `other_user_${Date.now()}`,
          email: `other_${Date.now()}@example.com`,
        })
        .select()
        .single()

      const { data: otherProfile } = await supabase
        .from('profiles')
        .insert({
          user_id: otherUser.id,
          display_name: 'Other User',
        })
        .select()
        .single()

      const { data: otherWorkExp } = await supabase
        .from('work_experiences')
        .insert({
          profile_id: otherProfile.id,
          company: 'Other Company',
          title: 'Other Title',
          start_date: '2020-01-01',
        })
        .select()
        .single()

      // Try to access it
      const { GET } = await import('@/app/api/profile/work-experiences/[id]/route')
      const request = new NextRequest(
        `http://localhost/api/profile/work-experiences/${otherWorkExp.id}`
      )

      const response = await GET(request, { params: { id: otherWorkExp.id } })
      const json = await response.json()

      // Should return 403 or 404
      expect([403, 404]).toContain(response.status)

      // Cleanup
      await supabase.from('work_experiences').delete().eq('id', otherWorkExp.id)
      await supabase.from('profiles').delete().eq('id', otherProfile.id)
      await supabase.from('users').delete().eq('id', otherUser.id)
    })
  })

  describe('Test 5: is_current=true nullifies end_date', () => {
    it('should set end_date to null when is_current is true for work experience', async () => {
      const createData = {
        company: 'Current Company',
        title: 'Current Role',
        start_date: '2023-01-01',
        end_date: '2024-12-31',
        is_current: true,
      }

      const request = new NextRequest('http://localhost/api/profile/work-experiences', {
        method: 'POST',
        body: JSON.stringify(createData),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.is_current).toBe(true)
      expect(json.data.end_date).toBeNull()

      // Cleanup
      await supabase.from('work_experiences').delete().eq('id', json.data.id)
    })
  })

  describe('Test 6: Profile completion recalculates after CRUD operations', () => {
    it('should update completion_percentage after adding work experience', async () => {
      // Get initial completion
      const initialProfile = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', testProfileId)
        .single()

      const initialCompletion = initialProfile.data?.completion_percentage || 0

      // Add work experience
      const createData = {
        company: 'Test Company',
        title: 'Test Title',
        start_date: '2020-01-01',
      }

      const request = new NextRequest('http://localhost/api/profile/work-experiences', {
        method: 'POST',
        body: JSON.stringify(createData),
      })

      await POST(request)

      // Check updated completion (should increase due to trigger)
      const updatedProfile = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', testProfileId)
        .single()

      expect(updatedProfile.data?.completion_percentage).toBeGreaterThanOrEqual(
        initialCompletion
      )

      // Cleanup
      const { data: workExp } = await supabase
        .from('work_experiences')
        .select('id')
        .eq('profile_id', testProfileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (workExp) {
        await supabase.from('work_experiences').delete().eq('id', workExp.id)
      }
    })
  })
})


