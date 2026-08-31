/**
 * Goal Shaper API Tests
 *
 * These tests validate the AI Goal Shaper API endpoint.
 * Tests cover both goal_id mode (save to DB) and goal_data mode (dry-run).
 *
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 * Set OPENAI_API_KEY for AI agent tests (or they will be skipped).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { POST } from '@/app/api/ai/goal-shaper/route'
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
    requireMentee: vi.fn(),
    ensureUserAndProfile: vi.fn(),
  }
})

// Skip tests if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiApiKey = process.env.OPENAI_API_KEY

const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey
const shouldRunAITests = shouldRunIntegrationTests && openaiApiKey

describe.skipIf(!shouldRunIntegrationTests)('Goal Shaper API', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testProfileId: string
  let testGoalId: string
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
        is_mentee: true,
      })
      .select()
      .single()

    if (profileError) throw profileError
    testProfileId = profileData.id

    // Create a test goal
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .insert({
        profile_id: testProfileId,
        title: 'Build Personal Finance Plan',
        description: 'Want to create a budget and investment strategy',
        category: 'Finance',
        duration_days: 30,
        status: 'draft',
        current_challenges: 'No prior finance experience',
      })
      .select()
      .single()

    if (goalError) throw goalError
    testGoalId = goalData.id
  })

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testGoalId) {
      await supabase.from('goal_milestones').delete().eq('goal_id', testGoalId)
      await supabase.from('goals').delete().eq('id', testGoalId)
    }
    if (testProfileId) {
      await supabase.from('profiles').delete().eq('id', testProfileId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  beforeEach(async () => {
    // Mock Clerk functions
    const { requireMentee, ensureUserAndProfile } = await import('@/lib/clerk')
    const profile = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testProfileId)
      .single()

    vi.mocked(requireMentee).mockResolvedValue(undefined)
    vi.mocked(ensureUserAndProfile).mockResolvedValue(profile.data as any)

    // Clean up any existing milestones from previous tests
    await supabase.from('goal_milestones').delete().eq('goal_id', testGoalId)
    
    // Reset goal AI fields
    await supabase
      .from('goals')
      .update({
        refined_goal_statement: null,
        suggested_mentor_questions: null,
        risks_pitfalls: null,
        ai_shaped_at: null,
        success_definition: null,
      })
      .eq('id', testGoalId)
  })

  describe('Test 1: POST with goal_id shapes goal and creates milestones in DB', () => {
    it.skipIf(!shouldRunAITests)(
      'should shape goal and save milestones to database',
      async () => {
        const request = new NextRequest('http://localhost/api/ai/goal-shaper', {
          method: 'POST',
          body: JSON.stringify({ goal_id: testGoalId }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.data).toBeDefined()
        expect(json.data.refined_goal_statement).toBeDefined()
        expect(json.data.milestones).toBeInstanceOf(Array)
        expect(json.data.milestones.length).toBeGreaterThanOrEqual(3)
        expect(json.data.milestones.length).toBeLessThanOrEqual(4) // 30-day goal
        expect(json.data.suggested_mentor_questions).toBeInstanceOf(Array)
        expect(json.data.risks_or_pitfalls).toBeInstanceOf(Array)
        expect(json.data.ai_shaped_at).toBeDefined()

        // Verify milestones were saved to database
        const { data: milestones } = await supabase
          .from('goal_milestones')
          .select('*')
          .eq('goal_id', testGoalId)
          .order('target_date', { ascending: true })

        expect(milestones).toBeDefined()
        expect(milestones?.length).toBe(json.data.milestones.length)
        expect(milestones?.[0].id).toBeDefined()
        expect(milestones?.[0].target_date).toBeDefined()

        // Verify goal was updated
        const { data: goal } = await supabase
          .from('goals')
          .select('refined_goal_statement, suggested_mentor_questions, risks_pitfalls, ai_shaped_at')
          .eq('id', testGoalId)
          .single()

        expect(goal?.refined_goal_statement).toBe(json.data.refined_goal_statement)
        expect(goal?.ai_shaped_at).toBeDefined()
      },
      60000 // 60 second timeout for AI processing
    )
  })

  describe('Test 2: POST with goal_data shapes without saving (dry-run mode)', () => {
    it.skipIf(!shouldRunAITests)(
      'should shape goal without saving to database',
      async () => {
        const request = new NextRequest('http://localhost/api/ai/goal-shaper', {
          method: 'POST',
          body: JSON.stringify({
            goal_data: {
              title: 'Launch a SaaS Product',
              duration_days: 60,
              current_challenges: 'Limited marketing budget',
              category: 'Entrepreneurship',
              description: 'Build and launch a SaaS product',
            },
          }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.data).toBeDefined()
        expect(json.data.refined_goal_statement).toBeDefined()
        expect(json.data.milestones).toBeInstanceOf(Array)
        expect(json.data.milestones.length).toBeGreaterThanOrEqual(5)
        expect(json.data.milestones.length).toBeLessThanOrEqual(7) // 60-day goal
        expect(json.data.milestones[0].target_date).toBeDefined()
        expect(json.data.milestones[0].relative_day_offset).toBeDefined()
        expect(json.data.suggested_mentor_questions).toBeInstanceOf(Array)
        expect(json.data.risks_or_pitfalls).toBeInstanceOf(Array)

        // Verify nothing was saved to database
        const { data: milestones } = await supabase
          .from('goal_milestones')
          .select('*')
          .eq('goal_id', testGoalId)

        expect(milestones?.length || 0).toBe(0)
      },
      60000 // 60 second timeout for AI processing
    )
  })

  describe('Test 3: API validates user owns goal before shaping', () => {
    it('should return 403 if user does not own goal', async () => {
      // Create another user and goal
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
          user_id: otherUser!.id,
          display_name: 'Other User',
          is_mentee: true,
        })
        .select()
        .single()

      const { data: otherGoal } = await supabase
        .from('goals')
        .insert({
          profile_id: otherProfile!.id,
          title: 'Other Goal',
          duration_days: 30,
          status: 'draft',
        })
        .select()
        .single()

      const request = new NextRequest('http://localhost/api/ai/goal-shaper', {
        method: 'POST',
        body: JSON.stringify({ goal_id: otherGoal!.id }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')

      // Cleanup
      await supabase.from('goals').delete().eq('id', otherGoal!.id)
      await supabase.from('profiles').delete().eq('id', otherProfile!.id)
      await supabase.from('users').delete().eq('id', otherUser!.id)
    })
  })

  describe('Test 4: API creates correct number of milestones', () => {
    it.skipIf(!shouldRunAITests)(
      'should create 3-4 milestones for 30-day goals',
      async () => {
        const request = new NextRequest('http://localhost/api/ai/goal-shaper', {
          method: 'POST',
          body: JSON.stringify({ goal_id: testGoalId }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.data.milestones.length).toBeGreaterThanOrEqual(3)
        expect(json.data.milestones.length).toBeLessThanOrEqual(4)
      },
      60000
    )

    it.skipIf(!shouldRunAITests)(
      'should create 5-7 milestones for 60-day goals',
      async () => {
        // Create a 60-day goal
        const { data: goal60 } = await supabase
          .from('goals')
          .insert({
            profile_id: testProfileId,
            title: 'Launch SaaS Product',
            duration_days: 60,
            status: 'draft',
          })
          .select()
          .single()

        const request = new NextRequest('http://localhost/api/ai/goal-shaper', {
          method: 'POST',
          body: JSON.stringify({ goal_id: goal60!.id }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.data.milestones.length).toBeGreaterThanOrEqual(5)
        expect(json.data.milestones.length).toBeLessThanOrEqual(7)

        // Cleanup
        await supabase.from('goal_milestones').delete().eq('goal_id', goal60!.id)
        await supabase.from('goals').delete().eq('id', goal60!.id)
      },
      60000
    )
  })

  describe('Test 5: API only populates success_definition if empty', () => {
    it.skipIf(!shouldRunAITests)(
      'should not overwrite existing success_definition',
      async () => {
        // Set an existing success definition
        const existingSuccessDef = 'User-defined success criteria'
        await supabase
          .from('goals')
          .update({ success_definition: existingSuccessDef })
          .eq('id', testGoalId)

        const request = new NextRequest('http://localhost/api/ai/goal-shaper', {
          method: 'POST',
          body: JSON.stringify({ goal_id: testGoalId }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        // Should use existing success definition, not AI-generated one
        expect(json.data.success_definition).toBe(existingSuccessDef)

        // Verify in database
        const { data: goal } = await supabase
          .from('goals')
          .select('success_definition')
          .eq('id', testGoalId)
          .single()

        expect(goal?.success_definition).toBe(existingSuccessDef)
      },
      60000
    )

    it.skipIf(!shouldRunAITests)(
      'should populate success_definition if empty',
      async () => {
        // Ensure success_definition is null
        await supabase
          .from('goals')
          .update({ success_definition: null })
          .eq('id', testGoalId)

        const request = new NextRequest('http://localhost/api/ai/goal-shaper', {
          method: 'POST',
          body: JSON.stringify({ goal_id: testGoalId }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.data.success_definition).toBeDefined()
        expect(json.data.success_definition.length).toBeGreaterThan(0)

        // Verify in database
        const { data: goal } = await supabase
          .from('goals')
          .select('success_definition')
          .eq('id', testGoalId)
          .single()

        expect(goal?.success_definition).toBeDefined()
        expect(goal?.success_definition).toBe(json.data.success_definition)
      },
      60000
    )
  })

  describe('Test 6: API validates milestone dates are within goal horizon', () => {
    it.skipIf(!shouldRunAITests)(
      'should ensure milestone target dates are within goal duration',
      async () => {
        const request = new NextRequest('http://localhost/api/ai/goal-shaper', {
          method: 'POST',
          body: JSON.stringify({ goal_id: testGoalId }),
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(200)

        // Get goal creation date
        const { data: goal } = await supabase
          .from('goals')
          .select('created_at, duration_days')
          .eq('id', testGoalId)
          .single()

        const goalStartDate = new Date(goal!.created_at)
        const goalEndDate = new Date(goalStartDate)
        goalEndDate.setDate(goalEndDate.getDate() + goal!.duration_days)

        // Verify all milestone dates are within horizon
        json.data.milestones.forEach((milestone: any) => {
          const milestoneDate = new Date(milestone.target_date)
          expect(milestoneDate.getTime()).toBeGreaterThanOrEqual(goalStartDate.getTime())
          expect(milestoneDate.getTime()).toBeLessThanOrEqual(goalEndDate.getTime())
        })
      },
      60000
    )
  })

  describe('Test 7: API handles validation errors', () => {
    it('should return 400 for invalid goal_id format', async () => {
      const request = new NextRequest('http://localhost/api/ai/goal-shaper', {
        method: 'POST',
        body: JSON.stringify({ goal_id: 'invalid-uuid' }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for missing required fields in goal_data', async () => {
      const request = new NextRequest('http://localhost/api/ai/goal-shaper', {
        method: 'POST',
        body: JSON.stringify({
          goal_data: {
            title: 'Test Goal',
            // Missing duration_days
          },
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 404 for non-existent goal_id', async () => {
      const fakeGoalId = '00000000-0000-0000-0000-000000000000'
      const request = new NextRequest('http://localhost/api/ai/goal-shaper', {
        method: 'POST',
        body: JSON.stringify({ goal_id: fakeGoalId }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error.code).toBe('GOAL_NOT_FOUND')
    })
  })
})


