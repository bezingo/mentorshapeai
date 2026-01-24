/**
 * Integration tests for Mentor Availability API
 * 
 * Tests cover:
 * - GET /api/mentor/availability - Fetch weekly availability patterns
 * - POST /api/mentor/availability - Create availability slot
 * - Overlap detection
 * - Slot limit enforcement (max 5 per day)
 * - Timezone handling
 * 
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { GET, POST } from '@/app/api/mentor/availability/route'
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
    ensureUserAndProfile: vi.fn(),
    requireAuth: vi.fn(),
  }
})

// Skip tests if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRunIntegrationTests)('Mentor Availability API', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testProfileId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create a test user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: `test_clerk_avail_${Date.now()}`,
        email: `test_avail_${Date.now()}@example.com`,
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
        display_name: 'Test Availability User',
        headline: 'Test Headline',
        is_mentor: true, // Must be mentor for availability
      })
      .select()
      .single()

    if (profileError) throw profileError
    testProfileId = profileData.id
  })

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testProfileId) {
      await supabase.from('mentor_availability').delete().eq('profile_id', testProfileId)
      await supabase.from('profiles').delete().eq('id', testProfileId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  beforeEach(async () => {
    // Clean up availability slots before each test
    if (testProfileId) {
      await supabase.from('mentor_availability').delete().eq('profile_id', testProfileId)
    }

    // Reset mock
    const { ensureUserAndProfile, requireAuth } = await import('@/lib/clerk')
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(ensureUserAndProfile).mockResolvedValue({
      id: testProfileId,
      user_id: testUserId,
      display_name: 'Test Availability User',
      is_mentor: true,
    } as any)
  })

  // ============================================================
  // GET /api/mentor/availability Tests
  // ============================================================
  describe('GET /api/mentor/availability', () => {
    it('should return empty array when no slots exist', async () => {
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toEqual([])
    })

    it('should return existing availability slots', async () => {
      // Create some slots
      await supabase.from('mentor_availability').insert([
        {
          profile_id: testProfileId,
          day_of_week: 1, // Monday
          start_time: '09:00',
          end_time: '11:00',
          timezone: 'UTC',
          is_active: true,
        },
        {
          profile_id: testProfileId,
          day_of_week: 3, // Wednesday
          start_time: '14:00',
          end_time: '16:00',
          timezone: 'UTC',
          is_active: true,
        },
      ])

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.length).toBe(2)
      expect(json.data[0].day_of_week).toBe(1)
      expect(json.data[1].day_of_week).toBe(3)
    })

    it('should order slots by day_of_week and start_time', async () => {
      await supabase.from('mentor_availability').insert([
        {
          profile_id: testProfileId,
          day_of_week: 3,
          start_time: '09:00',
          end_time: '11:00',
          timezone: 'UTC',
        },
        {
          profile_id: testProfileId,
          day_of_week: 1,
          start_time: '14:00',
          end_time: '16:00',
          timezone: 'UTC',
        },
        {
          profile_id: testProfileId,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          timezone: 'UTC',
        },
      ])

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      // Should be ordered: Monday 09:00, Monday 14:00, Wednesday 09:00
      expect(json.data[0].day_of_week).toBe(1)
      expect(json.data[0].start_time).toBe('09:00:00')
      expect(json.data[1].day_of_week).toBe(1)
      expect(json.data[1].start_time).toBe('14:00:00')
      expect(json.data[2].day_of_week).toBe(3)
    })
  })

  // ============================================================
  // POST /api/mentor/availability Tests
  // ============================================================
  describe('POST /api/mentor/availability', () => {
    it('should create a new availability slot', async () => {
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          timezone: 'America/New_York',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data.day_of_week).toBe(1)
      expect(json.data.start_time).toBe('09:00:00')
      expect(json.data.end_time).toBe('11:00:00')
      expect(json.data.timezone).toBe('America/New_York')
      expect(json.data.is_active).toBe(true)
    })

    it('should detect and reject overlapping slots', async () => {
      // Create first slot: Monday 09:00-11:00
      await supabase.from('mentor_availability').insert({
        profile_id: testProfileId,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '11:00',
        timezone: 'UTC',
      })

      // Try to create overlapping slot: Monday 10:00-12:00
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '10:00',
          end_time: '12:00',
          timezone: 'UTC',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('AVAILABILITY_OVERLAP')
      expect(json.error.overlapping_slot).toBeDefined()
    })

    it('should allow adjacent slots (no overlap)', async () => {
      // Create first slot: Monday 09:00-10:00
      await supabase.from('mentor_availability').insert({
        profile_id: testProfileId,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
        timezone: 'UTC',
      })

      // Create adjacent slot: Monday 10:00-11:00 (should succeed)
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '10:00',
          end_time: '11:00',
          timezone: 'UTC',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data.start_time).toBe('10:00:00')
    })

    it('should enforce max slots per day (5)', async () => {
      // Create 5 non-overlapping slots on Monday
      const slots = [
        { start: '08:00', end: '09:00' },
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' },
        { start: '11:00', end: '12:00' },
        { start: '14:00', end: '15:00' },
      ]

      for (const slot of slots) {
        await supabase.from('mentor_availability').insert({
          profile_id: testProfileId,
          day_of_week: 1,
          start_time: slot.start,
          end_time: slot.end,
          timezone: 'UTC',
        })
      }

      // Try to create 6th slot
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '16:00',
          end_time: '17:00',
          timezone: 'UTC',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('MAX_SLOTS_EXCEEDED')
    })

    it('should reject invalid time format', async () => {
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '9:00', // Invalid - missing leading zero
          end_time: '11:00',
          timezone: 'UTC',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject end_time before start_time', async () => {
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '11:00',
          end_time: '09:00',
          timezone: 'UTC',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('AVAILABILITY_INVALID_RANGE')
    })

    it('should reject invalid day_of_week', async () => {
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 7, // Invalid - must be 0-6
          start_time: '09:00',
          end_time: '11:00',
          timezone: 'UTC',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject invalid timezone', async () => {
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          timezone: 'Invalid/Timezone',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('INVALID_TIMEZONE')
    })

    it('should accept valid timezones', async () => {
      const timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']

      for (let i = 0; i < timezones.length; i++) {
        const request = new NextRequest('http://localhost/api/mentor/availability', {
          method: 'POST',
          body: JSON.stringify({
            day_of_week: i, // Use different days to avoid overlap
            start_time: '09:00',
            end_time: '11:00',
            timezone: timezones[i],
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(201)
        expect(json.data.timezone).toBe(timezones[i])
      }
    })

    it('should create slot with is_active=false when specified', async () => {
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          timezone: 'UTC',
          is_active: false,
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data.is_active).toBe(false)
    })

    it('should allow same time slot on different days', async () => {
      // Create Monday 09:00-11:00
      await supabase.from('mentor_availability').insert({
        profile_id: testProfileId,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '11:00',
        timezone: 'UTC',
      })

      // Create same time on Wednesday - should succeed
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 3,
          start_time: '09:00',
          end_time: '11:00',
          timezone: 'UTC',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
    })

    it('should not count inactive slots toward overlap', async () => {
      // Create inactive slot
      await supabase.from('mentor_availability').insert({
        profile_id: testProfileId,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '11:00',
        timezone: 'UTC',
        is_active: false,
      })

      // Create overlapping active slot - should succeed
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '10:00',
          end_time: '12:00',
          timezone: 'UTC',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
    })
  })

  // ============================================================
  // Edge Cases
  // ============================================================
  describe('Edge Cases', () => {
    it('should handle midnight slots correctly', async () => {
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '00:00',
          end_time: '01:00',
          timezone: 'UTC',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data.start_time).toBe('00:00:00')
    })

    it('should handle late night slots correctly', async () => {
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '23:00',
          end_time: '23:59',
          timezone: 'UTC',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
    })

    it('should handle half-hour offset timezones', async () => {
      const request = new NextRequest('http://localhost/api/mentor/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          timezone: 'Asia/Kolkata', // UTC+5:30
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data.timezone).toBe('Asia/Kolkata')
    })
  })
})
