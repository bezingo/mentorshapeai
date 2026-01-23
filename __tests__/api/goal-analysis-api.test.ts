/**
 * Goal Analysis API Tests
 *
 * These tests validate the Goal Analysis API endpoint.
 * Tests cover SWOT, SMART, and mentor notes generation via API.
 *
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 * Set OPENAI_API_KEY for AI agent tests (or they will be skipped).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { POST } from '@/app/api/ai/goal-analysis/route'
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

// Mock AI analysis functions
vi.mock('@/lib/ai/goal-analysis', async () => {
  const actual = await vi.importActual('@/lib/ai/goal-analysis')
  return {
    ...actual,
    generateSWOTAnalysis: vi.fn(async () => ({
      strengths: ['Mock Strength 1', 'Mock Strength 2'],
      weaknesses: ['Mock Weakness 1', 'Mock Weakness 2'],
      opportunities: ['Mock Opportunity 1', 'Mock Opportunity 2'],
      threats: ['Mock Threat 1', 'Mock Threat 2'],
    })),
    generateSMARTFramework: vi.fn(async () => ({
      specific: 'Mock specific goal statement',
      measurable: 'Mock measurable criteria',
      achievable: 'Mock achievable assessment',
      relevant: 'Mock relevant alignment',
      time_bound: 'Mock time-bound timeline',
    })),
    generateMentorNotes: vi.fn(async () => 'Mock mentor notes content for testing purposes.'),
  }
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRunIntegrationTests)('Goal Analysis API', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testProfileId: string
  let testGoalId: string
  let testClerkUserId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create test user
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

    // Create test profile
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

    // Create test goal
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .insert({
        profile_id: testProfileId,
        title: 'Test Goal for Analysis API',
        status: 'active',
        duration_days: 30,
      })
      .select()
      .single()

    if (goalError) throw goalError
    testGoalId = goalData.id
  })

  afterAll(async () => {
    // Cleanup
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
  })

  it('should generate SWOT analysis via API', async () => {
    const request = new NextRequest('http://localhost/api/ai/goal-analysis', {
      method: 'POST',
      body: JSON.stringify({
        goal_id: testGoalId,
        analysis_type: 'swot',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.swot_analysis).toBeDefined()
    expect(json.data.swot_analysis.strengths).toBeInstanceOf(Array)

    // Verify saved to database
    const { data: goal } = await supabase
      .from('goals')
      .select('swot_analysis, swot_generated_at')
      .eq('id', testGoalId)
      .single()

    expect(goal?.swot_analysis).toBeDefined()
    expect(goal?.swot_generated_at).toBeDefined()
  })

  it('should generate SMART framework via API', async () => {
    const request = new NextRequest('http://localhost/api/ai/goal-analysis', {
      method: 'POST',
      body: JSON.stringify({
        goal_id: testGoalId,
        analysis_type: 'smart',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.smart_framework).toBeDefined()
    expect(json.data.smart_framework.specific).toBeDefined()

    // Verify saved to database
    const { data: goal } = await supabase
      .from('goals')
      .select('smart_framework, smart_generated_at')
      .eq('id', testGoalId)
      .single()

    expect(goal?.smart_framework).toBeDefined()
    expect(goal?.smart_generated_at).toBeDefined()
  })

  it('should generate mentor notes via API', async () => {
    const request = new NextRequest('http://localhost/api/ai/goal-analysis', {
      method: 'POST',
      body: JSON.stringify({
        goal_id: testGoalId,
        analysis_type: 'mentor_notes',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.mentor_notes).toBeDefined()
    expect(typeof json.data.mentor_notes).toBe('string')

    // Verify saved to database
    const { data: goal } = await supabase
      .from('goals')
      .select('mentor_notes, mentor_notes_generated_at')
      .eq('id', testGoalId)
      .single()

    expect(goal?.mentor_notes).toBeDefined()
    expect(goal?.mentor_notes_generated_at).toBeDefined()
  })

  it('should generate all analysis types when analysis_type is "all"', async () => {
    const request = new NextRequest('http://localhost/api/ai/goal-analysis', {
      method: 'POST',
      body: JSON.stringify({
        goal_id: testGoalId,
        analysis_type: 'all',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.swot_analysis).toBeDefined()
    expect(json.data.smart_framework).toBeDefined()
    expect(json.data.mentor_notes).toBeDefined()
  })

  it('should return 404 for non-existent goal', async () => {
    const request = new NextRequest('http://localhost/api/ai/goal-analysis', {
      method: 'POST',
      body: JSON.stringify({
        goal_id: '00000000-0000-0000-0000-000000000000',
        analysis_type: 'swot',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error.code).toBe('GOAL_NOT_FOUND')
  })

  it('should return 400 for invalid analysis_type', async () => {
    const request = new NextRequest('http://localhost/api/ai/goal-analysis', {
      method: 'POST',
      body: JSON.stringify({
        goal_id: testGoalId,
        analysis_type: 'invalid',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })
})


