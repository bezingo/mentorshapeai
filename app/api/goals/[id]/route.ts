import { NextResponse, NextRequest } from 'next/server'
import { requireMentee } from '@/lib/auth-helpers'
import { ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { createGoalVersion, type ChangeSource } from '@/lib/utils/goal-versioning'

const UpdateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  duration_days: z.number().int().positive().optional(),
  success_definition: z.string().optional().nullable(),
  current_challenges: z.string().optional().nullable(),
  motivation: z.string().optional().nullable(),
  suggested_approach: z.string().optional().nullable(),
  refined_goal_statement: z.string().max(500).optional().nullable(),
  suggested_mentor_questions: z.array(z.string()).optional().nullable(),
  risks_pitfalls: z.any().optional().nullable(),
  swot_analysis: z.any().optional().nullable(),
  smart_framework: z.any().optional().nullable(),
  mentor_notes: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
})

/**
 * PATCH /api/goals/[id]
 * Update a goal
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

    const { id } = await params
    const body = await request.json()
    const validatedData = UpdateGoalSchema.parse(body)

    const serviceSupabase = createServiceClient()

    // Verify goal ownership
    const { data: existingGoal, error: fetchError } = await serviceSupabase
      .from('goals')
      .select('id, profile_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingGoal) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    if (existingGoal.profile_id !== profile.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to update this goal' } },
        { status: 403 }
      )
    }

    // Determine the change source based on which fields are being updated
    const changedFields = Object.keys(validatedData)
    let changeSource: ChangeSource = 'user'
    let changeSummary = 'Manual edit'
    
    // Detect if this is an AI-triggered update based on fields
    if (changedFields.includes('swot_analysis') && changedFields.length <= 2) {
      changeSource = 'ai_swot'
      changeSummary = 'SWOT analysis generated'
    } else if (changedFields.includes('smart_framework') && changedFields.length <= 2) {
      changeSource = 'ai_smart'
      changeSummary = 'SMART framework generated'
    } else if (changedFields.includes('mentor_notes') && changedFields.length === 1) {
      changeSummary = 'Mentor notes updated'
    } else if (
      changedFields.includes('refined_goal_statement') ||
      changedFields.includes('suggested_mentor_questions') ||
      changedFields.includes('risks_pitfalls')
    ) {
      changeSource = 'ai_shaper'
      changeSummary = 'Goal refined via AI shaping'
    } else if (changedFields.includes('status')) {
      changeSummary = `Status changed to ${validatedData.status}`
    } else {
      changeSummary = `Updated: ${changedFields.join(', ')}`
    }
    
    // Create a version snapshot before updating (only for significant changes)
    const significantFields = [
      'title', 'description', 'refined_goal_statement', 'success_definition',
      'current_challenges', 'suggested_mentor_questions', 'risks_pitfalls',
      'swot_analysis', 'smart_framework', 'mentor_notes'
    ]
    const hasSignificantChanges = changedFields.some(f => significantFields.includes(f))
    
    if (hasSignificantChanges) {
      await createGoalVersion(id, changeSource, changeSummary)
    }

    // Update goal
    const { data: updatedGoal, error: updateError } = await serviceSupabase
      .from('goals')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating goal:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: updatedGoal })
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

    console.error('Error updating goal:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update goal' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/goals/[id]
 * Delete a goal
 */
export async function DELETE(
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

    const { id } = await params
    const serviceSupabase = createServiceClient()

    // Verify goal ownership
    const { data: existingGoal, error: fetchError } = await serviceSupabase
      .from('goals')
      .select('id, profile_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existingGoal) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    if (existingGoal.profile_id !== profile.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to delete this goal' } },
        { status: 403 }
      )
    }

    // Check for active collaborations
    const { data: activeCollaborations, error: collabError } = await serviceSupabase
      .from('collaborations')
      .select('id, status')
      .eq('goal_id', id)
      .in('status', ['pending', 'active'])

    if (collabError) {
      console.error('Error checking collaborations:', collabError)
      return NextResponse.json(
        { error: { code: 'CHECK_FAILED', message: 'Failed to check collaborations' } },
        { status: 500 }
      )
    }

    if (activeCollaborations && activeCollaborations.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'HAS_ACTIVE_COLLABORATIONS',
            message: 'Cannot delete goal with active or pending collaborations. Please cancel or complete collaborations first.',
            active_count: activeCollaborations.length,
          },
        },
        { status: 400 }
      )
    }

    // Delete goal (cascade will handle milestones and collaborations)
    const { error: deleteError } = await serviceSupabase
      .from('goals')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting goal:', deleteError)
      return NextResponse.json(
        { error: { code: 'DELETE_FAILED', message: deleteError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { success: true, deleted_id: id } })
  } catch (error: any) {
    console.error('Error deleting goal:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete goal' } },
      { status: 500 }
    )
  }
}

