/**
 * Tests for AI Goal Shaper Agent
 *
 * These tests validate the Goal Shaper Agent's ability to expand user goals
 * into structured milestones, success criteria, and mentor questions.
 *
 * NOTE: These tests require OPENAI_API_KEY environment variable.
 * They make actual API calls to OpenAI and may incur costs.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { shapeGoal, type GoalShapingInput } from '@/lib/ai/goal-shaper'
import { GoalShapedDataSchema } from '@/lib/ai/goal-shaper'

const shouldRunAITests = !!process.env.OPENAI_API_KEY

describe.skipIf(!shouldRunAITests)('Goal Shaper Agent', () => {
  describe('Test 1: Agent expands simple goal into milestones (30-day goal)', () => {
    it('should generate 3-4 milestones for a 30-day goal', async () => {
      const input: GoalShapingInput = {
        title: 'Learn React',
        duration_days: 30,
        current_challenges: 'No prior JavaScript experience',
        category: 'Learning',
      }

      const result = await shapeGoal(input)

      // Validate schema
      GoalShapedDataSchema.parse(result)

      // Check milestone count
      expect(result.milestones.length).toBeGreaterThanOrEqual(3)
      expect(result.milestones.length).toBeLessThanOrEqual(4)

      // Check milestone structure
      result.milestones.forEach((milestone) => {
        expect(milestone.title).toBeTruthy()
        expect(milestone.title.length).toBeLessThanOrEqual(200)
        expect(milestone.description).toBeTruthy()
        expect(milestone.description.length).toBeLessThanOrEqual(1000)
        expect(milestone.relative_day_offset).toBeGreaterThanOrEqual(0)
        expect(milestone.relative_day_offset).toBeLessThanOrEqual(30)
      })

      // Check other outputs
      expect(result.refined_goal_statement).toBeTruthy()
      expect(result.refined_goal_statement.length).toBeLessThanOrEqual(500)
      expect(result.success_definition).toBeTruthy()
      expect(result.suggested_questions_for_mentor.length).toBeGreaterThanOrEqual(5)
      expect(result.suggested_questions_for_mentor.length).toBeLessThanOrEqual(8)
      expect(result.risks_or_pitfalls.length).toBeGreaterThan(0)
    }, 60000) // 60 second timeout for AI calls
  })

  describe('Test 2: Agent expands 60-day goal into 5-7 milestones', () => {
    it('should generate 5-7 milestones for a 60-day goal', async () => {
      const input: GoalShapingInput = {
        title: 'Build a SaaS product and launch MVP',
        duration_days: 60,
        current_challenges: 'Limited technical skills, no marketing experience',
        category: 'Startup',
        description: 'Want to build a project management tool for remote teams',
      }

      const result = await shapeGoal(input)

      // Validate schema
      GoalShapedDataSchema.parse(result)

      // Check milestone count
      expect(result.milestones.length).toBeGreaterThanOrEqual(5)
      expect(result.milestones.length).toBeLessThanOrEqual(7)

      // Check milestones respect time horizon
      result.milestones.forEach((milestone) => {
        expect(milestone.relative_day_offset).toBeGreaterThanOrEqual(0)
        expect(milestone.relative_day_offset).toBeLessThanOrEqual(60)
      })
    }, 60000)
  })

  describe('Test 3: Milestones respect time horizon', () => {
    it('should ensure all milestone offsets are within duration_days', async () => {
      const input: GoalShapingInput = {
        title: 'Get promoted to Senior Engineer',
        duration_days: 30,
        current_challenges: 'Need to demonstrate leadership skills',
        category: 'Career',
      }

      const result = await shapeGoal(input)

      result.milestones.forEach((milestone) => {
        expect(milestone.relative_day_offset).toBeGreaterThanOrEqual(0)
        expect(milestone.relative_day_offset).toBeLessThanOrEqual(30)
      })
    }, 60000)
  })

  describe('Test 4: Agent handles missing challenges gracefully', () => {
    it('should work with empty challenges string', async () => {
      const input: GoalShapingInput = {
        title: 'Run a marathon',
        duration_days: 60,
        current_challenges: '', // Empty string
        category: 'Fitness',
      }

      const result = await shapeGoal(input)

      // Should still generate valid output
      GoalShapedDataSchema.parse(result)
      expect(result.milestones.length).toBeGreaterThanOrEqual(5)
      expect(result.milestones.length).toBeLessThanOrEqual(7)
    }, 60000)

    it('should work without challenges field', async () => {
      const input: GoalShapingInput = {
        title: 'Learn Spanish',
        duration_days: 30,
        category: 'Learning',
      }

      const result = await shapeGoal(input)

      // Should still generate valid output
      GoalShapedDataSchema.parse(result)
      expect(result.milestones.length).toBeGreaterThanOrEqual(3)
    }, 60000)
  })

  describe('Test 5: Agent uses category to generate relevant milestones', () => {
    it('should generate category-specific milestones for Career goals', async () => {
      const input: GoalShapingInput = {
        title: 'Transition to Product Management',
        duration_days: 60,
        category: 'Career',
        current_challenges: 'Coming from engineering background',
      }

      const result = await shapeGoal(input)

      GoalShapedDataSchema.parse(result)

      // Check that milestones are relevant to career transition
      const milestoneTexts = result.milestones
        .map((m) => `${m.title} ${m.description}`)
        .join(' ')
        .toLowerCase()

      // Should contain career-related terms
      expect(
        milestoneTexts.includes('career') ||
          milestoneTexts.includes('role') ||
          milestoneTexts.includes('skills') ||
          milestoneTexts.includes('product')
      ).toBe(true)
    }, 60000)

    it('should generate category-specific milestones for Fitness goals', async () => {
      const input: GoalShapingInput = {
        title: 'Lose 20 pounds',
        duration_days: 60,
        category: 'Fitness',
        current_challenges: 'Busy schedule, inconsistent exercise',
      }

      const result = await shapeGoal(input)

      GoalShapedDataSchema.parse(result)

      const milestoneTexts = result.milestones
        .map((m) => `${m.title} ${m.description}`)
        .join(' ')
        .toLowerCase()

      // Should contain fitness-related terms
      expect(
        milestoneTexts.includes('exercise') ||
          milestoneTexts.includes('workout') ||
          milestoneTexts.includes('diet') ||
          milestoneTexts.includes('weight') ||
          milestoneTexts.includes('fitness')
      ).toBe(true)
    }, 60000)
  })

  describe('Test 6: Agent returns valid JSON matching schema', () => {
    it('should return data that passes Zod validation', async () => {
      const input: GoalShapingInput = {
        title: 'Start a side business',
        duration_days: 60,
        category: 'Startup',
        description: 'Want to build a consulting practice',
      }

      const result = await shapeGoal(input)

      // Should not throw when parsing
      const validated = GoalShapedDataSchema.parse(result)

      // Check all required fields
      expect(validated.refined_goal_statement).toBeTruthy()
      expect(validated.success_definition).toBeTruthy()
      expect(validated.milestones).toBeInstanceOf(Array)
      expect(validated.milestones.length).toBeGreaterThanOrEqual(3)
      expect(validated.suggested_questions_for_mentor).toBeInstanceOf(Array)
      expect(validated.suggested_questions_for_mentor.length).toBeGreaterThanOrEqual(5)
      expect(validated.risks_or_pitfalls).toBeInstanceOf(Array)
      expect(validated.risks_or_pitfalls.length).toBeGreaterThan(0)

      // Check risk-mitigation structure
      validated.risks_or_pitfalls.forEach((risk) => {
        expect(risk).toHaveProperty('risk')
        expect(risk).toHaveProperty('mitigation')
        expect(typeof risk.risk).toBe('string')
        expect(typeof risk.mitigation).toBe('string')
      })
    }, 60000)
  })
})


