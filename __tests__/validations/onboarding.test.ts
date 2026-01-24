/**
 * Unit tests for onboarding validation schemas
 * 
 * Tests cover:
 * - BioExpertiseSchema (Step 2)
 * - SkillsLanguagesSchema (Step 3)
 * - AvailabilitySlotSchema and AvailabilitySchema (Step 4)
 * - HandleSchema (Step 5)
 * - OnboardingFormDataSchema (combined)
 * - UpdateOnboardingSchema (API request)
 * - validateStep helper
 * - validateOnboardingComplete helper
 */

import { describe, it, expect } from 'vitest'
import {
  BioExpertiseSchema,
  SkillsLanguagesSchema,
  AvailabilitySlotSchema,
  AvailabilitySchema,
  HandleSchema,
  OnboardingFormDataSchema,
  UpdateOnboardingSchema,
  validateStep,
  validateOnboardingComplete,
  type OnboardingFormData,
} from '@/lib/validations/onboarding'

describe('Onboarding Validation Schemas', () => {
  // ============================================================
  // BioExpertiseSchema Tests (Step 2)
  // ============================================================
  describe('BioExpertiseSchema', () => {
    it('should accept valid bio and expertise areas', () => {
      const data = {
        bio: 'A'.repeat(50), // Minimum 50 characters
        expertise_areas: ['Career Advice', 'Technical Interviews'],
      }
      
      const result = BioExpertiseSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject bio under 50 characters', () => {
      const data = {
        bio: 'Too short',
        expertise_areas: ['Career Advice'],
      }
      
      const result = BioExpertiseSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('50')
      }
    })

    it('should reject bio over 1000 characters', () => {
      const data = {
        bio: 'A'.repeat(1001),
        expertise_areas: ['Career Advice'],
      }
      
      const result = BioExpertiseSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('1000')
      }
    })

    it('should reject empty expertise areas', () => {
      const data = {
        bio: 'A'.repeat(50),
        expertise_areas: [],
      }
      
      const result = BioExpertiseSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least one')
      }
    })

    it('should reject more than 10 expertise areas', () => {
      const data = {
        bio: 'A'.repeat(50),
        expertise_areas: Array.from({ length: 11 }, (_, i) => `Area ${i + 1}`),
      }
      
      const result = BioExpertiseSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('10')
      }
    })

    it('should accept exactly 10 expertise areas', () => {
      const data = {
        bio: 'A'.repeat(50),
        expertise_areas: Array.from({ length: 10 }, (_, i) => `Area ${i + 1}`),
      }
      
      const result = BioExpertiseSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  // ============================================================
  // SkillsLanguagesSchema Tests (Step 3)
  // ============================================================
  describe('SkillsLanguagesSchema', () => {
    it('should accept valid skills, languages, timezone, and years', () => {
      const data = {
        skills: ['JavaScript', 'React'],
        languages: ['English'],
        timezone: 'America/New_York',
        years_of_experience: 5,
      }
      
      const result = SkillsLanguagesSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept UTC as timezone', () => {
      const data = {
        skills: ['JavaScript'],
        languages: ['English'],
        timezone: 'UTC',
        years_of_experience: 0,
      }
      
      const result = SkillsLanguagesSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject empty skills array', () => {
      const data = {
        skills: [],
        languages: ['English'],
        timezone: 'UTC',
        years_of_experience: 5,
      }
      
      const result = SkillsLanguagesSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject more than 20 skills', () => {
      const data = {
        skills: Array.from({ length: 21 }, (_, i) => `Skill ${i + 1}`),
        languages: ['English'],
        timezone: 'UTC',
        years_of_experience: 5,
      }
      
      const result = SkillsLanguagesSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject more than 10 languages', () => {
      const data = {
        skills: ['JavaScript'],
        languages: Array.from({ length: 11 }, (_, i) => `Language ${i + 1}`),
        timezone: 'UTC',
        years_of_experience: 5,
      }
      
      const result = SkillsLanguagesSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid timezone format', () => {
      const data = {
        skills: ['JavaScript'],
        languages: ['English'],
        timezone: 'EST', // Not valid IANA format
        years_of_experience: 5,
      }
      
      const result = SkillsLanguagesSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject negative years of experience', () => {
      const data = {
        skills: ['JavaScript'],
        languages: ['English'],
        timezone: 'UTC',
        years_of_experience: -1,
      }
      
      const result = SkillsLanguagesSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject years of experience over 50', () => {
      const data = {
        skills: ['JavaScript'],
        languages: ['English'],
        timezone: 'UTC',
        years_of_experience: 51,
      }
      
      const result = SkillsLanguagesSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject non-integer years of experience', () => {
      const data = {
        skills: ['JavaScript'],
        languages: ['English'],
        timezone: 'UTC',
        years_of_experience: 5.5,
      }
      
      const result = SkillsLanguagesSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  // ============================================================
  // AvailabilitySlotSchema Tests (Step 4)
  // ============================================================
  describe('AvailabilitySlotSchema', () => {
    it('should accept valid availability slot', () => {
      const data = {
        day_of_week: 1,
        start_time: '09:00',
        end_time: '11:00',
      }
      
      const result = AvailabilitySlotSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept all valid days of week (0-6)', () => {
      for (let day = 0; day <= 6; day++) {
        const data = {
          day_of_week: day,
          start_time: '09:00',
          end_time: '11:00',
        }
        
        const result = AvailabilitySlotSchema.safeParse(data)
        expect(result.success).toBe(true)
      }
    })

    it('should reject day_of_week outside 0-6 range', () => {
      const invalidDays = [-1, 7, 10]
      
      for (const day of invalidDays) {
        const data = {
          day_of_week: day,
          start_time: '09:00',
          end_time: '11:00',
        }
        
        const result = AvailabilitySlotSchema.safeParse(data)
        expect(result.success).toBe(false)
      }
    })

    it('should reject invalid time format', () => {
      const invalidTimes = ['9:00', '24:00', '12:60', 'abc', '']
      
      for (const time of invalidTimes) {
        const data = {
          day_of_week: 1,
          start_time: time,
          end_time: '11:00',
        }
        
        const result = AvailabilitySlotSchema.safeParse(data)
        expect(result.success).toBe(false)
      }
    })

    it('should accept edge case times', () => {
      const edgeCases = [
        { start_time: '00:00', end_time: '01:00' },
        { start_time: '23:00', end_time: '23:59' },
      ]
      
      for (const times of edgeCases) {
        const data = {
          day_of_week: 1,
          ...times,
        }
        
        const result = AvailabilitySlotSchema.safeParse(data)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('AvailabilitySchema', () => {
    it('should accept empty availability array', () => {
      const data = {
        availability: [],
        calendar_connected: false,
      }
      
      const result = AvailabilitySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept array with valid slots', () => {
      const data = {
        availability: [
          { day_of_week: 1, start_time: '09:00', end_time: '11:00' },
          { day_of_week: 3, start_time: '14:00', end_time: '16:00' },
        ],
        calendar_connected: true,
      }
      
      const result = AvailabilitySchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should use defaults when fields are missing', () => {
      const data = {}
      
      const result = AvailabilitySchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.availability).toEqual([])
        expect(result.data.calendar_connected).toBe(false)
      }
    })
  })

  // ============================================================
  // HandleSchema Tests (Step 5)
  // ============================================================
  describe('HandleSchema', () => {
    it('should accept valid handles', () => {
      const validHandles = [
        'johndoe',
        'john-doe',
        'john123',
        'abc', // Minimum 3 chars
        'a'.repeat(30), // Maximum 30 chars
      ]
      
      for (const handle of validHandles) {
        const result = HandleSchema.safeParse({ handle })
        expect(result.success).toBe(true)
      }
    })

    it('should reject handles under 3 characters', () => {
      const result = HandleSchema.safeParse({ handle: 'ab' })
      expect(result.success).toBe(false)
    })

    it('should reject handles over 30 characters', () => {
      const result = HandleSchema.safeParse({ handle: 'a'.repeat(31) })
      expect(result.success).toBe(false)
    })

    it('should reject handles with uppercase letters', () => {
      const result = HandleSchema.safeParse({ handle: 'JohnDoe' })
      expect(result.success).toBe(false)
    })

    it('should reject handles with special characters', () => {
      const invalidHandles = [
        'john_doe', // underscore
        'john.doe', // dot
        'john@doe', // at
        'john doe', // space
      ]
      
      for (const handle of invalidHandles) {
        const result = HandleSchema.safeParse({ handle })
        expect(result.success).toBe(false)
      }
    })

    it('should reject reserved handles', () => {
      const reservedHandles = [
        'admin',
        'api',
        'dashboard',
        'settings',
        'mentor',
        'mentee',
        'support',
        'help',
      ]
      
      for (const handle of reservedHandles) {
        const result = HandleSchema.safeParse({ handle })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors[0].message).toContain('reserved')
        }
      }
    })

    it('should reject handles starting or ending with hyphen', () => {
      const invalidHandles = ['-johndoe', 'johndoe-']
      
      for (const handle of invalidHandles) {
        const result = HandleSchema.safeParse({ handle })
        expect(result.success).toBe(false)
      }
    })
  })

  // ============================================================
  // OnboardingFormDataSchema Tests
  // ============================================================
  describe('OnboardingFormDataSchema', () => {
    it('should accept complete form data', () => {
      const data: Partial<OnboardingFormData> = {
        bio: 'A'.repeat(100),
        expertise_areas: ['Career Advice'],
        skills: ['JavaScript'],
        languages: ['English'],
        timezone: 'UTC',
        years_of_experience: 5,
        availability: [{ day_of_week: 1, start_time: '09:00', end_time: '11:00' }],
        calendar_connected: false,
        handle: 'johndoe',
      }
      
      const result = OnboardingFormDataSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept partial form data (all fields optional)', () => {
      const data = {}
      
      const result = OnboardingFormDataSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept form data with only some fields', () => {
      const data = {
        bio: 'Some bio text',
        handle: 'johndoe',
      }
      
      const result = OnboardingFormDataSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  // ============================================================
  // UpdateOnboardingSchema Tests
  // ============================================================
  describe('UpdateOnboardingSchema', () => {
    it('should accept valid update with current_step', () => {
      const data = {
        current_step: 3,
      }
      
      const result = UpdateOnboardingSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept valid update with completed_steps', () => {
      const data = {
        completed_steps: [1, 2, 3],
      }
      
      const result = UpdateOnboardingSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept valid update with form_data', () => {
      const data = {
        form_data: {
          bio: 'Updated bio',
        },
      }
      
      const result = UpdateOnboardingSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject current_step outside 1-6 range', () => {
      const invalidSteps = [0, 7, -1]
      
      for (const step of invalidSteps) {
        const result = UpdateOnboardingSchema.safeParse({ current_step: step })
        expect(result.success).toBe(false)
      }
    })

    it('should reject completed_steps with values outside 1-6', () => {
      const result = UpdateOnboardingSchema.safeParse({ completed_steps: [1, 7] })
      expect(result.success).toBe(false)
    })
  })

  // ============================================================
  // validateStep Helper Tests
  // ============================================================
  describe('validateStep', () => {
    it('should validate step 1 (welcome) - always valid', () => {
      const result = validateStep(1, {})
      expect(result.valid).toBe(true)
    })

    it('should validate step 2 (bio & expertise)', () => {
      // Valid
      const validResult = validateStep(2, {
        bio: 'A'.repeat(50),
        expertise_areas: ['Career Advice'],
      })
      expect(validResult.valid).toBe(true)

      // Invalid
      const invalidResult = validateStep(2, {
        bio: 'Too short',
        expertise_areas: [],
      })
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.errors).toBeDefined()
    })

    it('should validate step 3 (skills & languages)', () => {
      // Valid
      const validResult = validateStep(3, {
        skills: ['JavaScript'],
        languages: ['English'],
        timezone: 'UTC',
        years_of_experience: 5,
      })
      expect(validResult.valid).toBe(true)

      // Invalid
      const invalidResult = validateStep(3, {
        skills: [],
        languages: [],
        timezone: 'UTC',
        years_of_experience: 5,
      })
      expect(invalidResult.valid).toBe(false)
    })

    it('should validate step 4 (availability) - optional', () => {
      // Empty availability is valid
      const emptyResult = validateStep(4, {})
      expect(emptyResult.valid).toBe(true)

      // Valid availability
      const validResult = validateStep(4, {
        availability: [{ day_of_week: 1, start_time: '09:00', end_time: '11:00' }],
      })
      expect(validResult.valid).toBe(true)
    })

    it('should validate step 5 (handle)', () => {
      // Valid
      const validResult = validateStep(5, { handle: 'johndoe' })
      expect(validResult.valid).toBe(true)

      // Invalid - reserved
      const invalidResult = validateStep(5, { handle: 'admin' })
      expect(invalidResult.valid).toBe(false)
    })

    it('should validate step 6 (review) - always valid', () => {
      const result = validateStep(6, {})
      expect(result.valid).toBe(true)
    })

    it('should return error for invalid step number', () => {
      const result = validateStep(7, {})
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid step number')
    })
  })

  // ============================================================
  // validateOnboardingComplete Helper Tests
  // ============================================================
  describe('validateOnboardingComplete', () => {
    const completeFormData: Partial<OnboardingFormData> = {
      bio: 'A'.repeat(50),
      expertise_areas: ['Career Advice'],
      skills: ['JavaScript'],
      languages: ['English'],
      timezone: 'UTC',
      years_of_experience: 5,
      handle: 'johndoe',
    }

    it('should validate when all steps complete and data valid', () => {
      const result = validateOnboardingComplete([1, 2, 3, 4, 5], completeFormData)
      expect(result.valid).toBe(true)
    })

    it('should fail when required steps are missing', () => {
      const result = validateOnboardingComplete([1, 2], completeFormData)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Steps 3, 4, 5 must be completed')
    })

    it('should fail when bio is missing', () => {
      const result = validateOnboardingComplete([1, 2, 3, 4, 5], {
        ...completeFormData,
        bio: undefined,
      })
      expect(result.valid).toBe(false)
      expect(result.errors?.some(e => e.includes('Bio'))).toBe(true)
    })

    it('should fail when bio is too short', () => {
      const result = validateOnboardingComplete([1, 2, 3, 4, 5], {
        ...completeFormData,
        bio: 'Too short',
      })
      expect(result.valid).toBe(false)
    })

    it('should fail when expertise_areas is empty', () => {
      const result = validateOnboardingComplete([1, 2, 3, 4, 5], {
        ...completeFormData,
        expertise_areas: [],
      })
      expect(result.valid).toBe(false)
    })

    it('should fail when skills is empty', () => {
      const result = validateOnboardingComplete([1, 2, 3, 4, 5], {
        ...completeFormData,
        skills: [],
      })
      expect(result.valid).toBe(false)
    })

    it('should fail when languages is empty', () => {
      const result = validateOnboardingComplete([1, 2, 3, 4, 5], {
        ...completeFormData,
        languages: [],
      })
      expect(result.valid).toBe(false)
    })

    it('should fail when timezone is missing', () => {
      const result = validateOnboardingComplete([1, 2, 3, 4, 5], {
        ...completeFormData,
        timezone: undefined,
      })
      expect(result.valid).toBe(false)
    })

    it('should fail when years_of_experience is missing', () => {
      const result = validateOnboardingComplete([1, 2, 3, 4, 5], {
        ...completeFormData,
        years_of_experience: undefined,
      })
      expect(result.valid).toBe(false)
    })

    it('should fail when handle is missing', () => {
      const result = validateOnboardingComplete([1, 2, 3, 4, 5], {
        ...completeFormData,
        handle: undefined,
      })
      expect(result.valid).toBe(false)
    })

    it('should return multiple errors when multiple fields are missing', () => {
      const result = validateOnboardingComplete([1], {})
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(1)
    })
  })
})
