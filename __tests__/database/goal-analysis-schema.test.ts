/**
 * Goal Analysis Schema Tests
 *
 * These tests validate the database schema changes for SWOT, SMART, and mentor notes fields.
 * Tests verify storage and retrieval of analysis data.
 *
 * NOTE: These tests require a running Supabase instance with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRunIntegrationTests)('Goal Analysis Schema', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testProfileId: string
  let testGoalId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create test user and profile
    const { data: userData } = await supabase
      .from('users')
      .insert({
        clerk_user_id: `test_clerk_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
      })
      .select()
      .single()

    testUserId = userData!.id

    const { data: profileData } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId,
        display_name: 'Test User',
        headline: 'Test Headline',
        is_mentee: true,
      })
      .select()
      .single()

    testProfileId = profileData!.id

    // Create test goal
    const { data: goalData } = await supabase
      .from('goals')
      .insert({
        profile_id: testProfileId,
        title: 'Test Goal for Analysis',
        status: 'active',
      })
      .select()
      .single()

    testGoalId = goalData!.id
  })

  afterAll(async () => {
    // Cleanup
    if (testGoalId) {
      await supabase.from('goals').delete().eq('id', testGoalId)
    }
    if (testProfileId) {
      await supabase.from('profiles').delete().eq('id', testProfileId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  it('should store and retrieve SWOT analysis', async () => {
    const swotData = {
      strengths: ['Strong work ethic', 'Good communication skills'],
      weaknesses: ['Limited experience', 'Time management'],
      opportunities: ['Growing industry', 'Networking events'],
      threats: ['Market competition', 'Economic uncertainty'],
    }

    const { data: updatedGoal, error } = await supabase
      .from('goals')
      .update({
        swot_analysis: swotData,
        swot_generated_at: new Date().toISOString(),
      })
      .eq('id', testGoalId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updatedGoal?.swot_analysis).toEqual(swotData)
    expect(updatedGoal?.swot_generated_at).toBeDefined()
  })

  it('should store and retrieve SMART framework', async () => {
    const smartData = {
      specific: 'Learn React and build a portfolio project',
      measurable: 'Complete 3 projects and pass technical interview',
      achievable: 'With 2 hours daily practice over 30 days',
      relevant: 'Aligns with career goal of becoming a frontend developer',
      time_bound: 'Complete within 30 days, starting January 1st',
    }

    const { data: updatedGoal, error } = await supabase
      .from('goals')
      .update({
        smart_framework: smartData,
        smart_generated_at: new Date().toISOString(),
      })
      .eq('id', testGoalId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updatedGoal?.smart_framework).toEqual(smartData)
    expect(updatedGoal?.smart_generated_at).toBeDefined()
  })

  it('should store and retrieve mentor notes', async () => {
    const mentorNotes =
      'This mentee is working on improving their public speaking skills. They have identified key challenges including stage fright and lack of structure. The goal is to deliver 3 successful presentations within 60 days. Key areas for mentorship include building confidence, structuring presentations, and handling Q&A sessions.'

    const { data: updatedGoal, error } = await supabase
      .from('goals')
      .update({
        mentor_notes: mentorNotes,
        mentor_notes_generated_at: new Date().toISOString(),
      })
      .eq('id', testGoalId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updatedGoal?.mentor_notes).toBe(mentorNotes)
    expect(updatedGoal?.mentor_notes_generated_at).toBeDefined()
  })

  it('should allow null values for all analysis fields', async () => {
    const { data: updatedGoal, error } = await supabase
      .from('goals')
      .update({
        swot_analysis: null,
        smart_framework: null,
        mentor_notes: null,
        swot_generated_at: null,
        smart_generated_at: null,
        mentor_notes_generated_at: null,
      })
      .eq('id', testGoalId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updatedGoal?.swot_analysis).toBeNull()
    expect(updatedGoal?.smart_framework).toBeNull()
    expect(updatedGoal?.mentor_notes).toBeNull()
  })
})


