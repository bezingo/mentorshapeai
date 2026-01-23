/**
 * Profile Import API Tests
 *
 * These tests validate the import APIs for LinkedIn and CV parsing.
 * Tests cover parsing, importing, and section-level confirmation.
 *
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { POST as parseLinkedIn } from '@/app/api/profile/parse-linkedin/route'
import { POST as parseCV } from '@/app/api/profile/parse-cv/route'
import { POST as importProfile } from '@/app/api/profile/import/route'
import { NextRequest } from 'next/server'

// Profile type for mock
interface MockProfile {
  id: string
  user_id: string
  display_name: string | null
  headline: string | null
  bio: string | null
  [key: string]: unknown
}

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
    getProfileId: vi.fn(),
    getCurrentProfile: vi.fn(),
  }
})

// Mock Firecrawl for LinkedIn parsing
vi.mock('@/lib/firecrawl', () => ({
  scrapeLinkedInProfile: vi.fn(),
}))

// Mock AI profile parser
vi.mock('@/lib/ai/profile-builder', () => ({
  parseProfileText: vi.fn(),
}))

// Skip tests if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRunIntegrationTests)('Profile Import APIs', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testProfileId: string
  let testClerkUserId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create a test user
    testClerkUserId = `test_clerk_import_${Date.now()}`
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: testClerkUserId,
        email: `test_import_${Date.now()}@example.com`,
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
        display_name: 'Test Import User',
        headline: 'Original Headline',
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
    // Reset mocks
    vi.clearAllMocks()

    // Mock auth helpers
    const { requireAuth, getProfileId, getCurrentProfile } = await import('@/lib/clerk')
    vi.mocked(requireAuth).mockResolvedValue(testClerkUserId)
    vi.mocked(getProfileId).mockResolvedValue(testProfileId)

    const profile = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testProfileId)
      .single()

    vi.mocked(getCurrentProfile).mockResolvedValue(profile.data as MockProfile)
  })

  describe('Test 1: /api/profile/parse-linkedin returns structured profile data', () => {
    it('should return parsed LinkedIn profile data without auto-saving', async () => {
      // Mock Firecrawl response
      const { scrapeLinkedInProfile } = await import('@/lib/firecrawl')
      vi.mocked(scrapeLinkedInProfile).mockResolvedValue(`
        John Doe
        Senior Software Engineer at Tech Company

        Experience:
        - Senior Software Engineer at Tech Company (2020-Present)
        - Software Engineer at Startup Inc (2018-2020)

        Education:
        - BS Computer Science, Stanford University (2014-2018)

        Skills: JavaScript, TypeScript, React, Node.js

        About:
        Passionate software engineer with 5+ years of experience building scalable web applications.
      `)

      // Mock AI parser
      const { parseProfileText } = await import('@/lib/ai/profile-builder')
      vi.mocked(parseProfileText).mockResolvedValue({
        display_name: 'John Doe',
        headline: 'Senior Software Engineer at Tech Company',
        bio: 'Passionate software engineer with 5+ years of experience building scalable web applications.',
        work_experiences: [
          {
            company: 'Tech Company',
            title: 'Senior Software Engineer',
            start_date: '2020-01',
            end_date: null,
            description: null,
          },
          {
            company: 'Startup Inc',
            title: 'Software Engineer',
            start_date: '2018-01',
            end_date: '2020-01',
            description: null,
          },
        ],
        educations: [
          {
            institution: 'Stanford University',
            degree: 'BS Computer Science',
            start_date: '2014-09',
            end_date: '2018-05',
          },
        ],
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      })

      const request = new NextRequest('http://localhost/api/profile/parse-linkedin', {
        method: 'POST',
        body: JSON.stringify({
          linkedin_url: 'https://www.linkedin.com/in/johndoe',
        }),
      })

      const response = await parseLinkedIn(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toHaveProperty('parsed')
      expect(json.data.parsed).toHaveProperty('display_name', 'John Doe')
      expect(json.data.parsed).toHaveProperty('headline')
      expect(json.data.parsed).toHaveProperty('bio')
      expect(json.data.parsed).toHaveProperty('work_experiences')
      expect(json.data.parsed).toHaveProperty('educations')
      expect(json.data.parsed).toHaveProperty('skills')
      expect(json.data.parsed.work_experiences).toHaveLength(2)
      expect(json.data.parsed.educations).toHaveLength(1)
      expect(json.data.parsed.skills).toHaveLength(4)

      // Verify data was NOT auto-saved (profile still has original data)
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, headline')
        .eq('id', testProfileId)
        .single()

      expect(profile?.display_name).toBe('Test Import User')
      expect(profile?.headline).toBe('Original Headline')
    })

    it('should return error for invalid LinkedIn URL', async () => {
      const request = new NextRequest('http://localhost/api/profile/parse-linkedin', {
        method: 'POST',
        body: JSON.stringify({
          linkedin_url: 'https://example.com/profile',
        }),
      })

      const response = await parseLinkedIn(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBeDefined()
      expect(json.error.code).toBe('INVALID_URL')
    })
  })

  describe('Test 2: /api/profile/parse-cv handles PDF upload and returns parsed data', () => {
    it('should accept and parse a PDF file', async () => {
      // Mock AI parser
      const { parseProfileText } = await import('@/lib/ai/profile-builder')
      vi.mocked(parseProfileText).mockResolvedValue({
        display_name: 'Jane Smith',
        headline: 'Product Manager',
        bio: 'Experienced product manager focused on user experience and growth.',
        work_experiences: [
          {
            company: 'Big Corp',
            title: 'Product Manager',
            start_date: '2021-03',
            end_date: null,
            description: 'Leading product strategy',
          },
        ],
        educations: [
          {
            institution: 'MIT',
            degree: 'MBA',
            start_date: '2019-09',
            end_date: '2021-05',
          },
        ],
        skills: ['Product Strategy', 'User Research', 'Agile'],
      })

      // Create a mock PDF file (plain text for testing since we mock the parser)
      const mockPdfContent = `
        Jane Smith
        Product Manager

        Experience:
        Product Manager at Big Corp (2021-Present)

        Education:
        MBA, MIT (2019-2021)

        Skills: Product Strategy, User Research, Agile
      `
      const file = new File([mockPdfContent], 'resume.txt', { type: 'text/plain' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost/api/profile/parse-cv', {
        method: 'POST',
        body: formData,
      })

      const response = await parseCV(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toHaveProperty('parsed')
      expect(json.data.parsed.display_name).toBe('Jane Smith')
      expect(json.data.parsed.headline).toBe('Product Manager')
      expect(json.data.parsed.bio).toBeDefined()
      expect(json.data.parsed.work_experiences).toHaveLength(1)
      expect(json.data.parsed.educations).toHaveLength(1)
      expect(json.data.parsed.skills).toHaveLength(3)
    })

    it('should reject files larger than 5MB', async () => {
      // Create a file larger than 5MB
      const largeContent = 'x'.repeat(6 * 1024 * 1024) // 6MB
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost/api/profile/parse-cv', {
        method: 'POST',
        body: formData,
      })

      const response = await parseCV(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('FILE_TOO_LARGE')
    })

    it('should reject unsupported file types', async () => {
      const file = new File(['test'], 'image.jpg', { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost/api/profile/parse-cv', {
        method: 'POST',
        body: formData,
      })

      const response = await parseCV(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('INVALID_FILE_TYPE')
    })
  })

  describe('Test 3: /api/profile/import saves parsed data to profile and sub-tables', () => {
    it('should save all sections when all confirmations are true', async () => {
      const importData = {
        sections: {
          personal: true,
          work: true,
          education: true,
          skills: true,
        },
        data: {
          display_name: 'Imported User',
          headline: 'Imported Headline',
          bio: 'Imported bio from LinkedIn.',
          work_experiences: [
            {
              company: 'Imported Company',
              title: 'Imported Title',
              start_date: '2022-01',
              end_date: null,
              description: 'Imported description',
            },
          ],
          educations: [
            {
              institution: 'Imported University',
              degree: 'Imported Degree',
              start_date: '2018-09',
              end_date: '2022-05',
            },
          ],
          skills: ['Imported Skill 1', 'Imported Skill 2'],
        },
      }

      const request = new NextRequest('http://localhost/api/profile/import', {
        method: 'POST',
        body: JSON.stringify(importData),
      })

      const response = await importProfile(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toHaveProperty('profile')
      expect(json.data.profile.display_name).toBe('Imported User')
      expect(json.data.profile.headline).toBe('Imported Headline')
      expect(json.data.profile.bio).toBe('Imported bio from LinkedIn.')

      // Verify work experiences were saved
      const { data: workExps } = await supabase
        .from('work_experiences')
        .select('*')
        .eq('profile_id', testProfileId)

      expect(workExps).toHaveLength(1)
      expect(workExps![0].company).toBe('Imported Company')

      // Verify educations were saved
      const { data: educations } = await supabase
        .from('educations')
        .select('*')
        .eq('profile_id', testProfileId)

      expect(educations).toHaveLength(1)
      expect(educations![0].institution).toBe('Imported University')

      // Verify skills were saved
      const { data: skills } = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', testProfileId)

      expect(skills).toHaveLength(2)
    })
  })

  describe('Test 4: Import respects user confirmation (only saves selected sections)', () => {
    beforeEach(async () => {
      // Clean up any existing sub-resources
      await supabase.from('work_experiences').delete().eq('profile_id', testProfileId)
      await supabase.from('educations').delete().eq('profile_id', testProfileId)
      await supabase.from('skills').delete().eq('profile_id', testProfileId)

      // Reset profile
      await supabase
        .from('profiles')
        .update({
          display_name: 'Test Import User',
          headline: 'Original Headline',
          bio: null,
        })
        .eq('id', testProfileId)

      // Re-mock getCurrentProfile with fresh data
      const { getCurrentProfile } = await import('@/lib/clerk')
      const profile = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testProfileId)
        .single()
      vi.mocked(getCurrentProfile).mockResolvedValue(profile.data as MockProfile)
    })

    it('should only import personal section when only personal is confirmed', async () => {
      const importData = {
        sections: {
          personal: true,
          work: false,
          education: false,
          skills: false,
        },
        data: {
          display_name: 'Partial Import User',
          headline: 'Partial Headline',
          bio: 'Partial bio.',
          work_experiences: [
            {
              company: 'Should Not Import',
              title: 'Should Not Import',
              start_date: '2022-01',
              end_date: null,
              description: null,
            },
          ],
          educations: [
            {
              institution: 'Should Not Import',
              degree: 'Should Not Import',
              start_date: '2018-09',
              end_date: '2022-05',
            },
          ],
          skills: ['Should Not Import'],
        },
      }

      const request = new NextRequest('http://localhost/api/profile/import', {
        method: 'POST',
        body: JSON.stringify(importData),
      })

      const response = await importProfile(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.profile.display_name).toBe('Partial Import User')
      expect(json.data.profile.headline).toBe('Partial Headline')

      // Verify work experiences were NOT saved
      const { data: workExps } = await supabase
        .from('work_experiences')
        .select('*')
        .eq('profile_id', testProfileId)

      expect(workExps).toHaveLength(0)

      // Verify educations were NOT saved
      const { data: educations } = await supabase
        .from('educations')
        .select('*')
        .eq('profile_id', testProfileId)

      expect(educations).toHaveLength(0)

      // Verify skills were NOT saved
      const { data: skills } = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', testProfileId)

      expect(skills).toHaveLength(0)
    })

    it('should only import work and skills when those are confirmed', async () => {
      const importData = {
        sections: {
          personal: false,
          work: true,
          education: false,
          skills: true,
        },
        data: {
          display_name: 'Should Not Update',
          headline: 'Should Not Update',
          bio: 'Should Not Update',
          work_experiences: [
            {
              company: 'Work Company',
              title: 'Work Title',
              start_date: '2022-01',
              end_date: null,
              description: null,
            },
          ],
          educations: [
            {
              institution: 'Should Not Import',
              degree: 'Should Not Import',
              start_date: '2018-09',
              end_date: '2022-05',
            },
          ],
          skills: ['Skill A', 'Skill B'],
        },
      }

      const request = new NextRequest('http://localhost/api/profile/import', {
        method: 'POST',
        body: JSON.stringify(importData),
      })

      const response = await importProfile(request)
      await response.json() // Read the response to complete the request

      expect(response.status).toBe(200)

      // Profile personal data should NOT be updated
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, headline, bio')
        .eq('id', testProfileId)
        .single()

      expect(profile?.display_name).toBe('Test Import User')
      expect(profile?.headline).toBe('Original Headline')

      // Work experiences SHOULD be saved
      const { data: workExps } = await supabase
        .from('work_experiences')
        .select('*')
        .eq('profile_id', testProfileId)

      expect(workExps).toHaveLength(1)
      expect(workExps![0].company).toBe('Work Company')

      // Educations should NOT be saved
      const { data: educations } = await supabase
        .from('educations')
        .select('*')
        .eq('profile_id', testProfileId)

      expect(educations).toHaveLength(0)

      // Skills SHOULD be saved
      const { data: skills } = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', testProfileId)

      expect(skills).toHaveLength(2)
    })
  })
})
