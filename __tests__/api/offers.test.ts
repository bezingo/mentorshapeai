/**
 * Integration tests for Mentor Offers API
 * 
 * Tests cover:
 * - GET /api/mentor/offers - Fetch mentor's offers
 * - POST /api/mentor/offers - Create new offer
 * - Type validation (free_collab, paid_consult, digital_product)
 * - Price and duration validation for paid offers
 * 
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { GET, POST } from '@/app/api/mentor/offers/route'
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

describe.skipIf(!shouldRunIntegrationTests)('Mentor Offers API', () => {
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
        clerk_user_id: `test_clerk_offers_${Date.now()}`,
        email: `test_offers_${Date.now()}@example.com`,
      })
      .select()
      .single()

    if (userError) throw userError
    testUserId = userData.id

    // Create a test profile (must be mentor)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId,
        display_name: 'Test Offers User',
        headline: 'Test Headline',
        is_mentor: true,
      })
      .select()
      .single()

    if (profileError) throw profileError
    testProfileId = profileData.id
  })

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testProfileId) {
      await supabase.from('mentor_offers').delete().eq('mentor_profile_id', testProfileId)
      await supabase.from('profiles').delete().eq('id', testProfileId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  beforeEach(async () => {
    // Clean up offers before each test
    if (testProfileId) {
      await supabase.from('mentor_offers').delete().eq('mentor_profile_id', testProfileId)
    }

    // Reset mock
    const { ensureUserAndProfile, requireAuth } = await import('@/lib/clerk')
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(ensureUserAndProfile).mockResolvedValue({
      id: testProfileId,
      user_id: testUserId,
      display_name: 'Test Offers User',
      is_mentor: true,
    } as any)
  })

  // ============================================================
  // GET /api/mentor/offers Tests
  // ============================================================
  describe('GET /api/mentor/offers', () => {
    it('should return empty array when no offers exist', async () => {
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toEqual([])
    })

    it('should return existing offers', async () => {
      // Create some offers
      await supabase.from('mentor_offers').insert([
        {
          mentor_profile_id: testProfileId,
          type: 'free_collab',
          title: 'Free Career Chat',
          description: 'A free 30-minute career chat',
          is_active: true,
          sort_order: 0,
        },
        {
          mentor_profile_id: testProfileId,
          type: 'paid_consult',
          title: 'Paid Consultation',
          description: 'In-depth consultation',
          price_cents: 5000,
          currency: 'usd',
          duration_minutes: 60,
          is_active: true,
          sort_order: 1,
        },
      ])

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.length).toBe(2)
    })

    it('should order offers by sort_order', async () => {
      await supabase.from('mentor_offers').insert([
        {
          mentor_profile_id: testProfileId,
          type: 'free_collab',
          title: 'Second Offer',
          is_active: true,
          sort_order: 2,
        },
        {
          mentor_profile_id: testProfileId,
          type: 'free_collab',
          title: 'First Offer',
          is_active: true,
          sort_order: 1,
        },
        {
          mentor_profile_id: testProfileId,
          type: 'free_collab',
          title: 'Third Offer',
          is_active: true,
          sort_order: 3,
        },
      ])

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data[0].title).toBe('First Offer')
      expect(json.data[1].title).toBe('Second Offer')
      expect(json.data[2].title).toBe('Third Offer')
    })
  })

  // ============================================================
  // POST /api/mentor/offers Tests
  // ============================================================
  describe('POST /api/mentor/offers', () => {
    describe('Free Collaboration Offers', () => {
      it('should create a free_collab offer', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'free_collab',
            title: 'Free Career Chat',
            description: 'A free 30-minute career discussion',
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(201)
        expect(json.data.type).toBe('free_collab')
        expect(json.data.title).toBe('Free Career Chat')
        expect(json.data.is_active).toBe(true)
        expect(json.data.payment_required).toBe(false)
      })

      it('should accept free_collab without price', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'free_collab',
            title: 'Free Mentorship',
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(201)
        expect(json.data.price_cents).toBeNull()
      })
    })

    describe('Paid Consultation Offers', () => {
      it('should create a paid_consult offer with price and duration', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'paid_consult',
            title: 'One-on-One Coaching',
            description: 'In-depth coaching session',
            price_cents: 10000, // $100.00
            duration_minutes: 60,
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(201)
        expect(json.data.type).toBe('paid_consult')
        expect(json.data.price_cents).toBe(10000)
        expect(json.data.duration_minutes).toBe(60)
        expect(json.data.payment_required).toBe(true) // Since Stripe not connected
      })

      it('should reject paid_consult without price', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'paid_consult',
            title: 'Paid Consultation',
            duration_minutes: 60,
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json.error.code).toBe('VALIDATION_ERROR')
      })

      it('should reject paid_consult without duration', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'paid_consult',
            title: 'Paid Consultation',
            price_cents: 5000,
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json.error.code).toBe('VALIDATION_ERROR')
      })

      it('should reject paid_consult with zero price', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'paid_consult',
            title: 'Paid Consultation',
            price_cents: 0,
            duration_minutes: 60,
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json.error.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('Digital Product Offers', () => {
      it('should create a digital_product offer', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'digital_product',
            title: 'Resume Template Bundle',
            description: 'A collection of professional resume templates',
            price_cents: 2999,
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(201)
        expect(json.data.type).toBe('digital_product')
        expect(json.data.price_cents).toBe(2999)
      })
    })

    describe('Validation Tests', () => {
      it('should reject invalid offer type', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'invalid_type',
            title: 'Invalid Offer',
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json.error.code).toBe('VALIDATION_ERROR')
      })

      it('should reject missing title', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'free_collab',
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json.error.code).toBe('VALIDATION_ERROR')
      })

      it('should reject title over 200 characters', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'free_collab',
            title: 'A'.repeat(201),
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json.error.code).toBe('VALIDATION_ERROR')
      })

      it('should reject description over 2000 characters', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'free_collab',
            title: 'Valid Title',
            description: 'A'.repeat(2001),
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json.error.code).toBe('VALIDATION_ERROR')
      })

      it('should reject negative price', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'paid_consult',
            title: 'Paid Consultation',
            price_cents: -100,
            duration_minutes: 60,
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(400)
      })

      it('should reject duration over 480 minutes (8 hours)', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'paid_consult',
            title: 'Very Long Consultation',
            price_cents: 10000,
            duration_minutes: 481,
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json.error.code).toBe('VALIDATION_ERROR')
      })

      it('should accept duration of exactly 480 minutes', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'paid_consult',
            title: 'Full Day Consultation',
            price_cents: 50000,
            duration_minutes: 480,
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(201)
      })

      it('should reject invalid currency format', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'paid_consult',
            title: 'Consultation',
            price_cents: 5000,
            duration_minutes: 60,
            currency: 'dollars', // Should be 3 chars like 'usd'
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(400)
      })
    })

    describe('Sort Order Tests', () => {
      it('should auto-increment sort_order for new offers', async () => {
        // Create first offer
        const request1 = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'free_collab',
            title: 'First Offer',
          }),
        })
        const response1 = await POST(request1)
        const json1 = await response1.json()

        // Create second offer
        const request2 = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'free_collab',
            title: 'Second Offer',
          }),
        })
        const response2 = await POST(request2)
        const json2 = await response2.json()

        expect(json2.data.sort_order).toBeGreaterThan(json1.data.sort_order)
      })

      it('should respect explicit sort_order when provided', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'free_collab',
            title: 'Explicit Order Offer',
            sort_order: 100,
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(201)
        expect(json.data.sort_order).toBe(100)
      })
    })

    describe('is_active Tests', () => {
      it('should default is_active to true', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'free_collab',
            title: 'Active by Default',
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(201)
        expect(json.data.is_active).toBe(true)
      })

      it('should allow creating inactive offer', async () => {
        const request = new NextRequest('http://localhost/api/mentor/offers', {
          method: 'POST',
          body: JSON.stringify({
            type: 'free_collab',
            title: 'Inactive Offer',
            is_active: false,
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(201)
        expect(json.data.is_active).toBe(false)
      })
    })
  })
})
