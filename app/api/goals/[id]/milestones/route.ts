import { NextResponse, NextRequest } from 'next/server'
import { requireMentee } from '@/lib/auth-helpers'
import { ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const MilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
})

const CreateMilestoneSchema = MilestoneSchema
const UpdateMilestoneSchema = MilestoneSchema.partial()

/**
 * GET /api/goals/[id]/milestones
 * List all milestones for a goal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id: goalId } = await params
    const serviceSupabase = createServiceClient()

    // Verify goal ownership
    const { data: goal, error: goalError } = await serviceSupabase
      .from('goals')
      .select('id, profile_id')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    if (goal.profile_id !== profile.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to view these milestones' } },
        { status: 403 }
      )
    }

    // Fetch milestones
    const { data: milestones, error: milestonesError } = await serviceSupabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('target_date', { ascending: true })

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch milestones' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: milestones || [] })
  } catch (error: any) {
    console.error('Error in GET milestones:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch milestones' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/goals/[id]/milestones
 * Create a new milestone for a goal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id: goalId } = await params
    const body = await request.json()
    const validatedData = CreateMilestoneSchema.parse(body)

    const serviceSupabase = createServiceClient()

    // Verify goal ownership
    const { data: goal, error: goalError } = await serviceSupabase
      .from('goals')
      .select('id, profile_id, created_at, duration_days')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    if (goal.profile_id !== profile.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to create milestones for this goal' } },
        { status: 403 }
      )
    }

    // Validate target_date is within goal horizon
    const goalCreatedAt = new Date(goal.created_at)
    const goalEndDate = new Date(goalCreatedAt)
    goalEndDate.setDate(goalEndDate.getDate() + (goal.duration_days || 30))
    const targetDate = new Date(validatedData.target_date)

    if (targetDate < goalCreatedAt || targetDate > goalEndDate) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_DATE',
            message: `Target date must be within goal horizon (${goalCreatedAt.toISOString().split('T')[0]} to ${goalEndDate.toISOString().split('T')[0]})`,
          },
        },
        { status: 400 }
      )
    }

    // Create milestone
    const { data: milestone, error: createError } = await serviceSupabase
      .from('goal_milestones')
      .insert({
        goal_id: goalId,
        title: validatedData.title,
        description: validatedData.description || null,
        target_date: validatedData.target_date,
        status: validatedData.status || 'pending',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating milestone:', createError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: createError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: milestone }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    console.error('Error creating milestone:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create milestone' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/goals/[id]/milestones
 * Bulk update milestones (for modal save)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id: goalId } = await params
    const body = await request.json()

    // Expect array of milestones: { milestones: [{ id?, title, description, target_date, ... }] }
    const BulkUpdateSchema = z.object({
      milestones: z.array(
        z.object({
          id: z.string().uuid().optional(),
          title: z.string().min(1).max(200),
          description: z.string().max(1000).optional().nullable(),
          target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          status: z.enum(['pending', 'in_progress', 'done']).optional(),
        })
      ),
    })

    const validatedData = BulkUpdateSchema.parse(body)
    const serviceSupabase = createServiceClient()

    // Verify goal ownership
    const { data: goal, error: goalError } = await serviceSupabase
      .from('goals')
      .select('id, profile_id, created_at, duration_days')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    if (goal.profile_id !== profile.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to update milestones for this goal' } },
        { status: 403 }
      )
    }

    // Get existing milestones
    const { data: existingMilestones } = await serviceSupabase
      .from('goal_milestones')
      .select('id')
      .eq('goal_id', goalId)

    const existingIds = new Set((existingMilestones || []).map((m) => m.id))
    const newMilestones = validatedData.milestones.filter((m) => !m.id)
    const updateMilestones = validatedData.milestones.filter((m) => m.id && existingIds.has(m.id))
    const deleteIds = Array.from(existingIds).filter(
      (id) => !validatedData.milestones.some((m) => m.id === id)
    )

    // Validate target dates
    const goalCreatedAt = new Date(goal.created_at)
    const goalEndDate = new Date(goalCreatedAt)
    goalEndDate.setDate(goalEndDate.getDate() + (goal.duration_days || 30))

    for (const milestone of validatedData.milestones) {
      const targetDate = new Date(milestone.target_date)
      if (targetDate < goalCreatedAt || targetDate > goalEndDate) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_DATE',
              message: `Milestone "${milestone.title}" has invalid target date`,
            },
          },
          { status: 400 }
        )
      }
    }

    // Delete milestones that are no longer in the list
    if (deleteIds.length > 0) {
      const { error: deleteError } = await serviceSupabase
        .from('goal_milestones')
        .delete()
        .in('id', deleteIds)

      if (deleteError) {
        console.error('Error deleting milestones:', deleteError)
        return NextResponse.json(
          { error: { code: 'DELETE_FAILED', message: 'Failed to delete milestones' } },
          { status: 500 }
        )
      }
    }

    // Update existing milestones
    for (const milestone of updateMilestones) {
      const { error: updateError } = await serviceSupabase
        .from('goal_milestones')
        .update({
          title: milestone.title,
          description: milestone.description || null,
          target_date: milestone.target_date,
          status: milestone.status || 'pending',
        })
        .eq('id', milestone.id!)

      if (updateError) {
        console.error('Error updating milestone:', updateError)
        return NextResponse.json(
          { error: { code: 'UPDATE_FAILED', message: 'Failed to update milestone' } },
          { status: 500 }
        )
      }
    }

    // Create new milestones
    if (newMilestones.length > 0) {
      const { error: createError } = await serviceSupabase
        .from('goal_milestones')
        .insert(
          newMilestones.map((m) => ({
            goal_id: goalId,
            title: m.title,
            description: m.description || null,
            target_date: m.target_date,
            status: m.status || 'pending',
          }))
        )

      if (createError) {
        console.error('Error creating milestones:', createError)
        return NextResponse.json(
          { error: { code: 'CREATE_FAILED', message: 'Failed to create milestones' } },
          { status: 500 }
        )
      }
    }

    // Fetch updated milestones
    const { data: updatedMilestones } = await serviceSupabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('target_date', { ascending: true })

    return NextResponse.json({ data: updatedMilestones || [] })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    console.error('Error updating milestones:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update milestones' } },
      { status: 500 }
    )
  }
}

