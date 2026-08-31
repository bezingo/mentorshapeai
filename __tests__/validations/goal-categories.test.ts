/**
 * Goal Categories Validation Tests
 *
 * M0 school-pilot: Only 4 categories are allowed:
 * - Finance
 * - Career
 * - Personal Growth
 * - Entrepreneurship
 *
 * Legacy categories (Startup, Fitness, Learning) are not accepted in new goals.
 */

import { describe, it, expect } from 'vitest'
import { GoalPlanningStateSchema } from '@/lib/ai/goal-planner'

describe('Goal Categories - M0 School Pilot', () => {
  describe('Allowed Categories', () => {
    const allowedCategories = ['Finance', 'Career', 'Personal Growth', 'Entrepreneurship']

    allowedCategories.forEach((category) => {
      it(`should accept '${category}' as a valid category`, () => {
        const state = {
          title: 'Test Goal',
          category,
          conversation_complete: true,
          missing_fields: [],
        }

        const result = GoalPlanningStateSchema.safeParse(state)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.category).toBe(category)
        }
      })
    })
  })

  describe('Disallowed Legacy Categories', () => {
    const legacyCategories = ['Startup', 'Fitness', 'Learning']

    legacyCategories.forEach((category) => {
      it(`should reject legacy category '${category}'`, () => {
        const state = {
          title: 'Test Goal',
          category,
          conversation_complete: true,
          missing_fields: [],
        }

        const result = GoalPlanningStateSchema.safeParse(state)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Optional Category', () => {
    it('should allow goals without a category', () => {
      const state = {
        title: 'Test Goal',
        conversation_complete: true,
        missing_fields: [],
      }

      const result = GoalPlanningStateSchema.safeParse(state)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.category).toBeUndefined()
      }
    })

    it('should allow undefined category explicitly', () => {
      const state = {
        title: 'Test Goal',
        category: undefined,
        conversation_complete: true,
        missing_fields: [],
      }

      const result = GoalPlanningStateSchema.safeParse(state)
      expect(result.success).toBe(true)
    })
  })

  describe('Case Sensitivity', () => {
    it('should reject lowercase categories (schema is case-sensitive)', () => {
      const state = {
        title: 'Test Goal',
        category: 'finance', // lowercase
        conversation_complete: true,
        missing_fields: [],
      }

      const result = GoalPlanningStateSchema.safeParse(state)
      expect(result.success).toBe(false)
    })

    it('should reject mixed case categories', () => {
      const state = {
        title: 'Test Goal',
        category: 'CAREER', // uppercase
        conversation_complete: true,
        missing_fields: [],
      }

      const result = GoalPlanningStateSchema.safeParse(state)
      expect(result.success).toBe(false)
    })
  })
})
