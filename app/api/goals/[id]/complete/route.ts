import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { generateCompletionSummary, saveCompletionSummary } from '@/lib/ai/completion-agent'

/**
 * Schema for goal completion request
 */
const CompleteGoalSchema = z.object({
  mentee_reflection: z.string().max(2000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
})

/**
 * POST /api/goals/[id]/complete
 * Mark a goal as complete and create a goal_completions record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id: goalId } = await params
    const supabase = createServiceClient()

    // Parse optional body
    let body: z.infer<typeof CompleteGoalSchema> = {}
    try {
      const rawBody = await request.json()
      body = CompleteGoalSchema.parse(rawBody)
    } catch {
      // Body is optional, default to empty
    }

    // Fetch goal with ownership verification
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select(`
        id,
        title,
        profile_id,
        status
      `)
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      if (goalError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Goal not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching goal:', goalError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch goal' } },
        { status: 500 }
      )
    }

    // Verify ownership - only goal owner (mentee) can mark as complete
    if (goal.profile_id !== profile.id) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only the goal owner can mark this goal as complete',
          },
        },
        { status: 403 }
      )
    }

    // Check if goal is already completed
    if (goal.status === 'completed') {
      return NextResponse.json(
        {
          error: {
            code: 'ALREADY_COMPLETED',
            message: 'This goal is already marked as complete',
          },
        },
        { status: 400 }
      )
    }

    // Check if goal is in a valid state to complete
    if (goal.status !== 'active' && goal.status !== 'draft') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot complete a goal with status '${goal.status}'`,
          },
        },
        { status: 400 }
      )
    }

    // Check if a completion record already exists
    const { data: existingCompletion } = await supabase
      .from('goal_completions')
      .select('id')
      .eq('goal_id', goalId)
      .single()

    if (existingCompletion) {
      return NextResponse.json(
        {
          error: {
            code: 'COMPLETION_EXISTS',
            message: 'A completion record already exists for this goal',
          },
        },
        { status: 400 }
      )
    }

    // Find active collaboration for this goal (if any)
    const { data: collaboration } = await supabase
      .from('collaborations')
      .select('id, mentor_profile_id, mentee_profile_id, status')
      .eq('goal_id', goalId)
      .in('status', ['active', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Create goal completion record
    const completionData: Record<string, unknown> = {
      goal_id: goalId,
      collaboration_id: collaboration?.id || null,
      completed_by: profile.id,
      mentee_reflection: body.mentee_reflection || null,
      rating: body.rating || null,
      completed_at: new Date().toISOString(),
    }

    const { data: completion, error: completionError } = await supabase
      .from('goal_completions')
      .insert(completionData)
      .select()
      .single()

    if (completionError) {
      console.error('Error creating goal completion:', completionError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: completionError.message } },
        { status: 500 }
      )
    }

    // Update goal status to completed
    const { error: updateError } = await supabase
      .from('goals')
      .update({ status: 'completed' })
      .eq('id', goalId)

    if (updateError) {
      console.error('Error updating goal status:', updateError)
      // Don't fail the request, completion record is created
    }

    // Update collaboration status if exists
    if (collaboration) {
      const { error: collabUpdateError } = await supabase
        .from('collaborations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', collaboration.id)

      if (collabUpdateError) {
        console.error('Error updating collaboration status:', collabUpdateError)
        // Don't fail the request
      }
    }

    // Generate AI summary asynchronously (don't block response)
    generateCompletionSummary(goalId)
      .then((summary) => saveCompletionSummary(completion.id, summary))
      .catch((err) => console.error('Error generating completion summary:', err))

    return NextResponse.json({
      data: {
        ...completion,
        message: 'Goal marked as complete',
        has_collaboration: !!collaboration,
        needs_mentor_confirmation: !!collaboration,
      },
    })
  } catch (error: unknown) {
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

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/goals/[id]/complete:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to complete goal' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/goals/[id]/complete
 * Get the completion record for a goal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id: goalId } = await params
    const supabase = createServiceClient()

    // Fetch goal to verify access
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, profile_id, public_slug')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    // Check access - must be goal owner, or goal is public, or user is mentor in collaboration
    const { data: collaboration } = await supabase
      .from('collaborations')
      .select('mentor_profile_id')
      .eq('goal_id', goalId)
      .single()

    const isOwner = goal.profile_id === profile.id
    const isMentor = collaboration?.mentor_profile_id === profile.id
    const isPublic = !!goal.public_slug

    if (!isOwner && !isMentor && !isPublic) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this goal completion',
          },
        },
        { status: 403 }
      )
    }

    // Fetch completion record
    const { data: completion, error: completionError } = await supabase
      .from('goal_completions')
      .select(`
        *,
        completed_by_profile:profiles!goal_completions_completed_by_fkey(
          id,
          display_name,
          avatar_url
        ),
        confirmed_by_profile:profiles!goal_completions_confirmed_by_fkey(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('goal_id', goalId)
      .single()

    if (completionError) {
      if (completionError.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'No completion record found for this goal' } },
          { status: 404 }
        )
      }
      console.error('Error fetching completion:', completionError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch completion' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: completion })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/goals/[id]/complete:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch completion' } },
      { status: 500 }
    )
  }
}
