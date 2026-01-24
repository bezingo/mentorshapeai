import { z } from 'zod'

/**
 * Onboarding form validation schemas
 * Each step has its own schema for partial validation
 */

// IANA timezone validation (basic check)
const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$/

// Handle validation: 3-30 chars, lowercase letters, numbers, hyphens
const handleRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/

const RESERVED_HANDLES = [
  'admin',
  'api',
  'dashboard',
  'settings',
  'sign-in',
  'sign-up',
  'pricing',
  'g',
  'm',
  'app',
  'www',
  'mail',
  'ftp',
  'localhost',
  'test',
  'staging',
  'production',
  'mentor',
  'mentee',
  'support',
  'help',
  'about',
  'contact',
  'blog',
  'legal',
  'privacy',
  'terms',
]

// ===== Step 1: Welcome =====
// No form data to validate, just acknowledgment

// ===== Step 2: Bio & Expertise =====
export const BioExpertiseSchema = z.object({
  bio: z
    .string()
    .min(50, 'Bio must be at least 50 characters')
    .max(1000, 'Bio must be 1000 characters or less'),
  expertise_areas: z
    .array(z.string().min(1).max(100))
    .min(1, 'Select at least one expertise area')
    .max(10, 'Maximum 10 expertise areas allowed'),
})

// ===== Step 3: Skills & Languages =====
export const SkillsLanguagesSchema = z.object({
  skills: z
    .array(z.string().min(1).max(100))
    .min(1, 'Select at least one skill')
    .max(20, 'Maximum 20 skills allowed'),
  languages: z
    .array(z.string().min(1).max(50))
    .min(1, 'Select at least one language')
    .max(10, 'Maximum 10 languages allowed'),
  timezone: z
    .string()
    .regex(timezoneRegex, 'Invalid timezone format')
    .or(z.literal('UTC')),
  years_of_experience: z
    .number()
    .int('Years must be a whole number')
    .min(0, 'Years cannot be negative')
    .max(50, 'Maximum 50 years'),
})

// ===== Step 4: Availability =====
export const AvailabilitySlotSchema = z.object({
  day_of_week: z.number().int().min(0).max(6), // 0=Sunday, 6=Saturday
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
})

export const AvailabilitySchema = z.object({
  availability: z.array(AvailabilitySlotSchema).optional().default([]),
  calendar_connected: z.boolean().optional().default(false),
})

// ===== Step 5: Handle =====
export const HandleSchema = z.object({
  handle: z
    .string()
    .min(3, 'Handle must be at least 3 characters')
    .max(30, 'Handle must be 30 characters or less')
    .regex(handleRegex, 'Handle can only contain lowercase letters, numbers, and hyphens')
    .refine(
      (handle) => !RESERVED_HANDLES.includes(handle.toLowerCase()),
      'This handle is reserved and cannot be used'
    ),
})

// ===== Step 6: Review =====
// No additional validation, just confirmation

// ===== Combined Form Data Schema =====
export const OnboardingFormDataSchema = z.object({
  // Step 2: Bio & Expertise
  bio: z.string().max(1000).optional(),
  expertise_areas: z.array(z.string().max(100)).max(10).optional(),

  // Step 3: Skills & Languages
  skills: z.array(z.string().max(100)).max(20).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),
  timezone: z.string().optional(),
  years_of_experience: z.number().int().min(0).max(50).optional(),

  // Step 4: Availability
  availability: z.array(AvailabilitySlotSchema).optional(),
  calendar_connected: z.boolean().optional(),

  // Step 5: Handle
  handle: z.string().max(30).optional(),
})

export type OnboardingFormData = z.infer<typeof OnboardingFormDataSchema>
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>

// ===== API Request Schemas =====

// PATCH /api/mentor/onboarding request body
export const UpdateOnboardingSchema = z.object({
  current_step: z.number().int().min(1).max(6).optional(),
  completed_steps: z.array(z.number().int().min(1).max(6)).optional(),
  form_data: OnboardingFormDataSchema.partial().optional(),
})

export type UpdateOnboardingInput = z.infer<typeof UpdateOnboardingSchema>

// ===== Step Validation Helpers =====

/**
 * Validate form data for a specific step
 * Returns validation errors if any
 */
export function validateStep(
  step: number,
  formData: Partial<OnboardingFormData>
): { valid: boolean; errors?: string[] } {
  try {
    switch (step) {
      case 1:
        // Welcome step - no validation needed
        return { valid: true }

      case 2:
        BioExpertiseSchema.parse({
          bio: formData.bio,
          expertise_areas: formData.expertise_areas,
        })
        return { valid: true }

      case 3:
        SkillsLanguagesSchema.parse({
          skills: formData.skills,
          languages: formData.languages,
          timezone: formData.timezone,
          years_of_experience: formData.years_of_experience,
        })
        return { valid: true }

      case 4:
        // Availability is optional, but if provided must be valid
        if (formData.availability && formData.availability.length > 0) {
          AvailabilitySchema.parse({
            availability: formData.availability,
            calendar_connected: formData.calendar_connected,
          })
        }
        return { valid: true }

      case 5:
        HandleSchema.parse({
          handle: formData.handle,
        })
        return { valid: true }

      case 6:
        // Review step - validate all previous steps are complete
        // This is handled at the API level
        return { valid: true }

      default:
        return { valid: false, errors: ['Invalid step number'] }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => e.message),
      }
    }
    return { valid: false, errors: ['Validation failed'] }
  }
}

/**
 * Validate that all required steps are complete before finishing onboarding
 */
export function validateOnboardingComplete(
  completedSteps: number[],
  formData: Partial<OnboardingFormData>
): { valid: boolean; errors?: string[] } {
  const errors: string[] = []

  // Steps 1-5 must be completed (step 6 is review)
  const requiredSteps = [1, 2, 3, 4, 5]
  const missingSteps = requiredSteps.filter((step) => !completedSteps.includes(step))

  if (missingSteps.length > 0) {
    errors.push(`Steps ${missingSteps.join(', ')} must be completed`)
  }

  // Validate required fields
  if (!formData.bio || formData.bio.length < 50) {
    errors.push('Bio is required (minimum 50 characters)')
  }

  if (!formData.expertise_areas || formData.expertise_areas.length === 0) {
    errors.push('At least one expertise area is required')
  }

  if (!formData.skills || formData.skills.length === 0) {
    errors.push('At least one skill is required')
  }

  if (!formData.languages || formData.languages.length === 0) {
    errors.push('At least one language is required')
  }

  if (!formData.timezone) {
    errors.push('Timezone is required')
  }

  if (formData.years_of_experience === undefined || formData.years_of_experience === null) {
    errors.push('Years of experience is required')
  }

  if (!formData.handle) {
    errors.push('Handle is required')
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}
