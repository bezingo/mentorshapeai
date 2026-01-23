/**
 * Database Schema Tests for AI Goal Shaper Agent
 *
 * These tests validate the database schema extensions for the Goal Shaper Agent.
 * They test the new fields added through migration 010_goal_shaper_fields.sql.
 *
 * NOTE: These tests require a running Supabase instance with the migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Skip tests if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRunIntegrationTests)('Goal Shaper Schema Extensions', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testProfileId: string
  let testGoalId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create a test user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: `test_clerk_goal_shaper_${Date.now()}`,
        email: `test_goal_shaper_${Date.now()}@example.com`,
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
        title: 'Test Goal',
        duration_days: 30,
        status: 'draft',
      })
      .select()
      .single()

    if (goalError) throw goalError
    testGoalId = goalData.id
  })

  afterAll(async () => {
    // Cleanup: Delete test goal, profile, and user
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

  describe('Test 1: refined_goal_statement stores and retrieves correctly', () => {
    it('should store and retrieve refined_goal_statement (max 500 chars)', async () => {
      const testRefinedStatement =
        'Master React fundamentals and build a portfolio project within 30 days, demonstrating proficiency in component architecture, state management, and API integration.'

      const { error: updateError } = await supabase
        .from('goals')
        .update({ refined_goal_statement: testRefinedStatement })
        .eq('id', testGoalId)

      expect(updateError).toBeNull()

      const { data, error: selectError } = await supabase
        .from('goals')
        .select('refined_goal_statement')
        .eq('id', testGoalId)
        .single()

      expect(selectError).toBeNull()
      expect(data?.refined_goal_statement).toBe(testRefinedStatement)
    })

    it('should enforce max length constraint (500 chars)', async () => {
      const tooLongStatement = 'a'.repeat(501) // 501 characters

      const { error: updateError } = await supabase
        .from('goals')
        .update({ refined_goal_statement: tooLongStatement })
        .eq('id', testGoalId)

      expect(updateError).not.toBeNull()
      expect(updateError?.code).toBe('23514') // Check constraint violation

      // Valid length (500 chars) should work
      const validStatement = 'a'.repeat(500)
      const { error: validError } = await supabase
        .from('goals')
        .update({ refined_goal_statement: validStatement })
        .eq('id', testGoalId)

      expect(validError).toBeNull()
    })

    it('should allow null values', async () => {
      const { error: updateError } = await supabase
        .from('goals')
        .update({ refined_goal_statement: null })
        .eq('id', testGoalId)

      expect(updateError).toBeNull()

      const { data } = await supabase
        .from('goals')
        .select('refined_goal_statement')
        .eq('id', testGoalId)
        .single()

      expect(data?.refined_goal_statement).toBeNull()
    })
  })

  describe('Test 2: suggested_mentor_questions array stores multiple questions', () => {
    it('should store and retrieve suggested_mentor_questions array (max 20)', async () => {
      const testQuestions = [
        'What are the most important React concepts to focus on first?',
        'How should I structure my portfolio project?',
        'What common mistakes should I avoid as a beginner?',
        'How do I demonstrate my skills effectively?',
        'What resources do you recommend for learning React?',
      ]

      const { error: updateError } = await supabase
        .from('goals')
        .update({ suggested_mentor_questions: testQuestions })
        .eq('id', testGoalId)

      expect(updateError).toBeNull()

      const { data, error: selectError } = await supabase
        .from('goals')
        .select('suggested_mentor_questions')
        .eq('id', testGoalId)
        .single()

      expect(selectError).toBeNull()
      expect(data?.suggested_mentor_questions).toEqual(testQuestions)
      expect(data?.suggested_mentor_questions).toHaveLength(5)
    })

    it('should default to empty array', async () => {
      // Create a new goal to test default
      const { data: newGoal, error: insertError } = await supabase
        .from('goals')
        .insert({
          profile_id: testProfileId,
          title: 'New Test Goal',
          duration_days: 30,
        })
        .select('suggested_mentor_questions')
        .single()

      if (newGoal) {
        // Cleanup
        await supabase.from('goals').delete().eq('id', newGoal.id)
      }

      expect(insertError).toBeNull()
      expect(newGoal?.suggested_mentor_questions).toEqual([])
    })

    it('should enforce max array length constraint (20 items)', async () => {
      const tooManyQuestions = Array.from({ length: 21 }, (_, i) => `Question ${i + 1}`)

      const { error: updateError } = await supabase
        .from('goals')
        .update({ suggested_mentor_questions: tooManyQuestions })
        .eq('id', testGoalId)

      expect(updateError).not.toBeNull()
      expect(updateError?.code).toBe('23514') // Check constraint violation

      // Valid length (20 items) should work
      const validQuestions = Array.from({ length: 20 }, (_, i) => `Question ${i + 1}`)
      const { error: validError } = await supabase
        .from('goals')
        .update({ suggested_mentor_questions: validQuestions })
        .eq('id', testGoalId)

      expect(validError).toBeNull()
    })
  })

  describe('Test 3: risks_pitfalls JSONB stores structured risk-mitigation pairs', () => {
    it('should store and retrieve risks_pitfalls JSONB with risk-mitigation pairs', async () => {
      const testRisksPitfalls = [
        {
          risk: 'Overwhelmed by too many concepts at once',
          mitigation: 'Focus on one concept per day, practice with small exercises',
        },
        {
          risk: 'Lack of motivation after initial excitement',
          mitigation: 'Set daily reminders, join a study group, track progress',
        },
        {
          risk: 'Not building projects, only watching tutorials',
          mitigation: 'Build a small project each week, apply concepts immediately',
        },
      ]

      const { error: updateError } = await supabase
        .from('goals')
        .update({ risks_pitfalls: testRisksPitfalls })
        .eq('id', testGoalId)

      expect(updateError).toBeNull()

      const { data, error: selectError } = await supabase
        .from('goals')
        .select('risks_pitfalls')
        .eq('id', testGoalId)
        .single()

      expect(selectError).toBeNull()
      expect(data?.risks_pitfalls).toBeDefined()
      expect(Array.isArray(data?.risks_pitfalls)).toBe(true)
      expect(data?.risks_pitfalls).toHaveLength(3)
      expect(data?.risks_pitfalls[0]).toHaveProperty('risk')
      expect(data?.risks_pitfalls[0]).toHaveProperty('mitigation')
      expect(data?.risks_pitfalls[0].risk).toBe(testRisksPitfalls[0].risk)
      expect(data?.risks_pitfalls[0].mitigation).toBe(testRisksPitfalls[0].mitigation)
    })

    it('should allow null values', async () => {
      const { error: updateError } = await supabase
        .from('goals')
        .update({ risks_pitfalls: null })
        .eq('id', testGoalId)

      expect(updateError).toBeNull()

      const { data } = await supabase
        .from('goals')
        .select('risks_pitfalls')
        .eq('id', testGoalId)
        .single()

      expect(data?.risks_pitfalls).toBeNull()
    })

    it('should allow empty array', async () => {
      const { error: updateError } = await supabase
        .from('goals')
        .update({ risks_pitfalls: [] })
        .eq('id', testGoalId)

      expect(updateError).toBeNull()

      const { data } = await supabase
        .from('goals')
        .select('risks_pitfalls')
        .eq('id', testGoalId)
        .single()

      expect(data?.risks_pitfalls).toEqual([])
    })
  })

  describe('Test 4: ai_shaped_at timestamp updates correctly', () => {
    it('should store and retrieve ai_shaped_at timestamp', async () => {
      const testTimestamp = new Date('2025-12-21T10:30:00Z').toISOString()

      const { error: updateError } = await supabase
        .from('goals')
        .update({ ai_shaped_at: testTimestamp })
        .eq('id', testGoalId)

      expect(updateError).toBeNull()

      const { data, error: selectError } = await supabase
        .from('goals')
        .select('ai_shaped_at')
        .eq('id', testGoalId)
        .single()

      expect(selectError).toBeNull()
      expect(data?.ai_shaped_at).toBeDefined()
      // Supabase returns timestamps in ISO format, verify it matches
      expect(new Date(data?.ai_shaped_at).toISOString()).toBe(testTimestamp)
    })

    it('should allow null values', async () => {
      const { error: updateError } = await supabase
        .from('goals')
        .update({ ai_shaped_at: null })
        .eq('id', testGoalId)

      expect(updateError).toBeNull()

      const { data } = await supabase
        .from('goals')
        .select('ai_shaped_at')
        .eq('id', testGoalId)
        .single()

      expect(data?.ai_shaped_at).toBeNull()
    })

    it('should accept current timestamp', async () => {
      const now = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('goals')
        .update({ ai_shaped_at: now })
        .eq('id', testGoalId)

      expect(updateError).toBeNull()

      const { data } = await supabase
        .from('goals')
        .select('ai_shaped_at')
        .eq('id', testGoalId)
        .single()

      expect(data?.ai_shaped_at).toBeDefined()
      // Verify it's a valid timestamp
      expect(new Date(data?.ai_shaped_at).getTime()).toBeGreaterThan(0)
    })
  })
})


