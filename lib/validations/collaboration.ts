import { z } from 'zod'

/**
 * Collaboration validation schemas
 * Used for validating collaboration-related API requests
 */

/**
 * Valid collaboration statuses
 * Flow: pending → accepted → active → completed/cancelled
 *       pending → declined
 *       pending/accepted/active → cancelled
 */
export const CollaborationStatuses = [
  'pending',
  'accepted',
  'active',
  'completed',
  'cancelled',
  'declined',
] as const

export type CollaborationStatus = (typeof CollaborationStatuses)[number]

/**
 * Schema for creating a new collaboration request
 * Used by POST /api/collaborations
 */
export const CreateCollaborationSchema = z.object({
  goal_id: z.string().uuid('Invalid goal ID'),
  mentor_profile_id: z.string().uuid('Invalid mentor profile ID'),
  offer_id: z.string().uuid('Invalid offer ID').nullable().optional(),
  request_message: z
    .string()
    .max(2000, 'Request message must be 2000 characters or less')
    .nullable()
    .optional(),
})

export type CreateCollaborationInput = z.infer<typeof CreateCollaborationSchema>

/**
 * Schema for updating collaboration status
 * Used by PATCH /api/collaborations/[id]
 */
export const UpdateCollaborationSchema = z.object({
  status: z.enum(CollaborationStatuses).optional(),
  response_message: z
    .string()
    .max(2000, 'Response message must be 2000 characters or less')
    .nullable()
    .optional(),
})

export type UpdateCollaborationInput = z.infer<typeof UpdateCollaborationSchema>

/**
 * Schema for cancelling a collaboration
 * Used by DELETE /api/collaborations/[id]
 */
export const CancelCollaborationSchema = z.object({
  reason: z
    .string()
    .max(1000, 'Cancellation reason must be 1000 characters or less')
    .nullable()
    .optional(),
})

export type CancelCollaborationInput = z.infer<typeof CancelCollaborationSchema>

/**
 * Query parameters for listing collaborations
 * Used by GET /api/collaborations
 */
export const ListCollaborationsQuerySchema = z.object({
  as_mentor: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  as_mentee: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  status: z.enum(CollaborationStatuses).optional(),
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

export type ListCollaborationsQuery = z.infer<typeof ListCollaborationsQuerySchema>

/**
 * Valid status transitions for collaborations
 * Returns true if the transition is allowed
 */
export function isValidStatusTransition(
  currentStatus: CollaborationStatus,
  newStatus: CollaborationStatus,
  isMentor: boolean
): { valid: boolean; error?: string } {
  // Same status - no change
  if (currentStatus === newStatus) {
    return { valid: true }
  }

  // Define allowed transitions
  const transitions: Record<CollaborationStatus, CollaborationStatus[]> = {
    pending: ['accepted', 'declined', 'cancelled'],
    accepted: ['active', 'cancelled'],
    active: ['completed', 'cancelled'],
    completed: [], // Terminal state
    cancelled: [], // Terminal state
    declined: [], // Terminal state
  }

  const allowedNextStatuses = transitions[currentStatus]

  if (!allowedNextStatuses.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
    }
  }

  // Role-specific restrictions
  if (newStatus === 'accepted' && !isMentor) {
    return {
      valid: false,
      error: 'Only the mentor can accept a collaboration request',
    }
  }

  if (newStatus === 'declined' && !isMentor) {
    return {
      valid: false,
      error: 'Only the mentor can decline a collaboration request',
    }
  }

  if (newStatus === 'active' && !isMentor) {
    return {
      valid: false,
      error: 'Only the mentor can mark a collaboration as active',
    }
  }

  // Both parties can cancel or complete
  // (though completion typically requires mentor confirmation in practice)

  return { valid: true }
}

/**
 * Get timestamps to update based on status change
 */
export function getStatusTimestamps(
  newStatus: CollaborationStatus
): Record<string, string | null> {
  const now = new Date().toISOString()

  switch (newStatus) {
    case 'active':
      return { started_at: now }
    case 'completed':
      return { completed_at: now }
    case 'cancelled':
      return { cancelled_at: now }
    default:
      return {}
  }
}
