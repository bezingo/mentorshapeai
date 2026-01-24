import { z } from 'zod'

/**
 * Check-ins validation schemas
 * Used for validating check-ins-related API requests
 */

/**
 * Valid mood ratings (1-5)
 */
export const MIN_MOOD_RATING = 1
export const MAX_MOOD_RATING = 5

/**
 * Schema for creating a new check-in
 * Used by POST /api/collaborations/[id]/check-ins
 */
export const CreateCheckInSchema = z.object({
  week_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'week_start must be in YYYY-MM-DD format'),
  mood_rating: z
    .number()
    .int('Mood rating must be a whole number')
    .min(MIN_MOOD_RATING, `Mood rating must be at least ${MIN_MOOD_RATING}`)
    .max(MAX_MOOD_RATING, `Mood rating must be at most ${MAX_MOOD_RATING}`),
  progress_notes: z
    .string()
    .max(5000, 'Progress notes must be 5000 characters or less')
    .nullable()
    .optional(),
  blockers: z
    .string()
    .max(2000, 'Blockers must be 2000 characters or less')
    .nullable()
    .optional(),
  wins: z
    .string()
    .max(2000, 'Wins must be 2000 characters or less')
    .nullable()
    .optional(),
})

export type CreateCheckInInput = z.infer<typeof CreateCheckInSchema>

/**
 * Schema for updating a check-in
 * Used by PATCH /api/check-ins/[id]
 */
export const UpdateCheckInSchema = z.object({
  mood_rating: z
    .number()
    .int('Mood rating must be a whole number')
    .min(MIN_MOOD_RATING, `Mood rating must be at least ${MIN_MOOD_RATING}`)
    .max(MAX_MOOD_RATING, `Mood rating must be at most ${MAX_MOOD_RATING}`)
    .optional(),
  progress_notes: z
    .string()
    .max(5000, 'Progress notes must be 5000 characters or less')
    .nullable()
    .optional(),
  blockers: z
    .string()
    .max(2000, 'Blockers must be 2000 characters or less')
    .nullable()
    .optional(),
  wins: z
    .string()
    .max(2000, 'Wins must be 2000 characters or less')
    .nullable()
    .optional(),
})

export type UpdateCheckInInput = z.infer<typeof UpdateCheckInSchema>

/**
 * Query parameters for listing check-ins
 * Used by GET /api/collaborations/[id]/check-ins
 */
export const ListCheckInsQuerySchema = z.object({
  profile_id: z.string().uuid('Invalid profile ID').optional(),
  from_week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from_week must be in YYYY-MM-DD format')
    .optional(),
  to_week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to_week must be in YYYY-MM-DD format')
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0))
    .optional(),
})

export type ListCheckInsQuery = z.infer<typeof ListCheckInsQuerySchema>

/**
 * Get the start of the current week (Monday)
 */
export function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  // Adjust so Monday is the first day of the week
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

/**
 * Validate that week_start is a Monday
 */
export function isValidWeekStart(weekStart: string): {
  valid: boolean
  error?: string
} {
  const date = new Date(weekStart)
  const dayOfWeek = date.getUTCDay()

  // Monday is day 1 in getUTCDay() (Sunday is 0)
  if (dayOfWeek !== 1) {
    return {
      valid: false,
      error: 'week_start must be a Monday',
    }
  }

  return { valid: true }
}

/**
 * Validate that week_start is not in the future
 */
export function isWeekStartNotInFuture(weekStart: string): {
  valid: boolean
  error?: string
} {
  const weekStartDate = new Date(weekStart)
  const currentWeekStart = new Date(getCurrentWeekStart())

  if (weekStartDate > currentWeekStart) {
    return {
      valid: false,
      error: 'Cannot create check-in for a future week',
    }
  }

  return { valid: true }
}
