import { z } from 'zod'

/**
 * Focus validation schemas
 * Used for validating focus-related API requests
 */

/**
 * Valid focus statuses
 * Flow: scheduled → in_progress → completed/cancelled/no_show
 */
export const FocusStatuses = [
  'pending_payment',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const

export type FocusStatus = (typeof FocusStatuses)[number]

/**
 * Valid duration options for focuses (in minutes)
 */
export const FocusDurations = [30, 60] as const
export type FocusDuration = (typeof FocusDurations)[number]

/**
 * Schema for booking a new focus
 * Used by POST /api/collaborations/[id]/focuses
 */
export const BookFocusSchema = z.object({
  scheduled_at: z
    .string()
    .datetime({ message: 'scheduled_at must be a valid ISO 8601 datetime' }),
  duration_minutes: z
    .number()
    .int()
    .refine((val) => FocusDurations.includes(val as FocusDuration), {
      message: 'duration_minutes must be 30 or 60',
    })
    .default(60),
  // Optional fields for future calendar/meeting integration
  meeting_url: z.string().url('Invalid meeting URL').nullable().optional(),
  meeting_provider: z.enum(['zoom', 'google_meet', 'teams']).nullable().optional(),
  mentor_offer_id: z.string().uuid('Invalid mentor offer id').optional(),
})

export type BookFocusInput = z.infer<typeof BookFocusSchema>

/**
 * Schema for updating a focus
 * Used by PATCH /api/focuses/[id]
 */
export const UpdateFocusSchema = z
  .object({
    scheduled_at: z
      .string()
      .datetime({ message: 'scheduled_at must be a valid ISO 8601 datetime' })
      .optional(),
    status: z.enum(['cancelled']).optional(),
    cancellation_reason: z
      .string()
      .max(500, 'Cancellation reason must be 500 characters or less')
      .nullable()
      .optional(),
    meeting_url: z.string().url('Invalid meeting URL').nullable().optional(),
  })
  .refine(
    (data) => {
      // If cancelling, status must be 'cancelled'
      if (data.cancellation_reason && data.status !== 'cancelled') {
        return false
      }
      return true
    },
    { message: 'cancellation_reason requires status to be "cancelled"' }
  )

export type UpdateFocusInput = z.infer<typeof UpdateFocusSchema>

/**
 * Query parameters for listing focuses
 * Used by GET /api/collaborations/[id]/focuses
 */
export const ListFocusesQuerySchema = z.object({
  status: z.enum(FocusStatuses).optional(),
  from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from_date must be in YYYY-MM-DD format')
    .optional(),
  to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to_date must be in YYYY-MM-DD format')
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

export type ListFocusesQuery = z.infer<typeof ListFocusesQuerySchema>

/**
 * Valid status transitions for focuses
 * Returns true if the transition is allowed
 */
export function isValidFocusStatusTransition(
  currentStatus: FocusStatus,
  newStatus: FocusStatus
): { valid: boolean; error?: string } {
  // Same status - no change
  if (currentStatus === newStatus) {
    return { valid: true }
  }

  // Define allowed transitions
  const transitions: Record<FocusStatus, FocusStatus[]> = {
    pending_payment: ['scheduled', 'cancelled'],
    scheduled: ['in_progress', 'cancelled', 'no_show'],
    in_progress: ['completed', 'cancelled'],
    completed: [], // Terminal state
    cancelled: [], // Terminal state
    no_show: [], // Terminal state
  }

  const allowedNextStatuses = transitions[currentStatus]

  if (!allowedNextStatuses.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition focus from '${currentStatus}' to '${newStatus}'`,
    }
  }

  return { valid: true }
}

/**
 * Check if a focus can be cancelled based on its status
 */
export function canCancelFocus(status: FocusStatus): boolean {
  return ['scheduled', 'in_progress'].includes(status)
}

/**
 * Check if a focus can be rescheduled based on its status
 */
export function canRescheduleFocus(status: FocusStatus): boolean {
  return status === 'scheduled'
}

/**
 * Get timestamps to update based on focus status change
 */
export function getFocusStatusTimestamps(
  newStatus: FocusStatus,
  profileId?: string
): Record<string, string | null> {
  const now = new Date().toISOString()

  switch (newStatus) {
    case 'completed':
      return { completed_at: now }
    case 'cancelled':
      return { cancelled_at: now, cancelled_by: profileId || null }
    default:
      return {}
  }
}

/**
 * Validate that a scheduled time is in the future
 */
export function isScheduledTimeInFuture(scheduledAt: string): boolean {
  const scheduledDate = new Date(scheduledAt)
  const now = new Date()
  return scheduledDate > now
}

/**
 * Calculate the end time based on start time and duration
 */
export function calculateFocusEndTime(
  scheduledAt: string,
  durationMinutes: number
): Date {
  const startTime = new Date(scheduledAt)
  return new Date(startTime.getTime() + durationMinutes * 60 * 1000)
}

/**
 * Check if two time ranges overlap
 */
export function doFocusTimesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1
}

/**
 * Minimum notice required to book a focus (in hours)
 */
export const MIN_BOOKING_NOTICE_HOURS = 2

/**
 * Maximum days in advance a focus can be booked
 */
export const MAX_BOOKING_ADVANCE_DAYS = 60

/**
 * Validate booking timing constraints
 */
export function validateBookingTiming(scheduledAt: string): {
  valid: boolean
  error?: string
} {
  const scheduledDate = new Date(scheduledAt)
  const now = new Date()

  // Check minimum notice
  const minNoticeTime = new Date(
    now.getTime() + MIN_BOOKING_NOTICE_HOURS * 60 * 60 * 1000
  )
  if (scheduledDate < minNoticeTime) {
    return {
      valid: false,
      error: `Focus must be scheduled at least ${MIN_BOOKING_NOTICE_HOURS} hours in advance`,
    }
  }

  // Check maximum advance booking
  const maxAdvanceTime = new Date(
    now.getTime() + MAX_BOOKING_ADVANCE_DAYS * 24 * 60 * 60 * 1000
  )
  if (scheduledDate > maxAdvanceTime) {
    return {
      valid: false,
      error: `Focus cannot be scheduled more than ${MAX_BOOKING_ADVANCE_DAYS} days in advance`,
    }
  }

  return { valid: true }
}
