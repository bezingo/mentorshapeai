import { z } from 'zod'

/**
 * Action Items validation schemas
 * Used for validating action-items-related API requests
 */

/**
 * Valid action item statuses
 * Flow: pending → in_progress → completed/cancelled
 */
export const ActionItemStatuses = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
] as const

export type ActionItemStatus = (typeof ActionItemStatuses)[number]

/**
 * Schema for creating a new action item
 * Used by POST /api/collaborations/[id]/action-items
 */
export const CreateActionItemSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title must be 500 characters or less'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .nullable()
    .optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'due_date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),
  assignee_profile_id: z.string().uuid('Invalid assignee profile ID'),
  focus_id: z.string().uuid('Invalid focus ID').nullable().optional(),
})

export type CreateActionItemInput = z.infer<typeof CreateActionItemSchema>

/**
 * Schema for updating an action item
 * Used by PATCH /api/action-items/[id]
 */
export const UpdateActionItemSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title must be 500 characters or less')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .nullable()
    .optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'due_date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),
  status: z.enum(ActionItemStatuses).optional(),
})

export type UpdateActionItemInput = z.infer<typeof UpdateActionItemSchema>

/**
 * Query parameters for listing action items
 * Used by GET /api/collaborations/[id]/action-items
 */
export const ListActionItemsQuerySchema = z.object({
  status: z.enum(ActionItemStatuses).optional(),
  assignee_profile_id: z.string().uuid('Invalid assignee profile ID').optional(),
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

export type ListActionItemsQuery = z.infer<typeof ListActionItemsQuerySchema>

/**
 * Valid status transitions for action items
 * Returns true if the transition is allowed
 */
export function isValidActionItemStatusTransition(
  currentStatus: ActionItemStatus,
  newStatus: ActionItemStatus
): { valid: boolean; error?: string } {
  // Same status - no change
  if (currentStatus === newStatus) {
    return { valid: true }
  }

  // Define allowed transitions
  const transitions: Record<ActionItemStatus, ActionItemStatus[]> = {
    pending: ['in_progress', 'completed', 'cancelled'],
    in_progress: ['pending', 'completed', 'cancelled'],
    completed: ['pending', 'in_progress'], // Allow reopening completed items
    cancelled: ['pending'], // Allow restoring cancelled items
  }

  const allowedNextStatuses = transitions[currentStatus]

  if (!allowedNextStatuses.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition action item from '${currentStatus}' to '${newStatus}'`,
    }
  }

  return { valid: true }
}

/**
 * Get timestamps to update based on status change
 */
export function getActionItemStatusTimestamps(
  newStatus: ActionItemStatus
): Record<string, string | null> {
  const now = new Date().toISOString()

  switch (newStatus) {
    case 'completed':
      return { completed_at: now }
    case 'pending':
    case 'in_progress':
    case 'cancelled':
      // Clear completed_at when reopening or cancelling
      return { completed_at: null }
    default:
      return {}
  }
}
