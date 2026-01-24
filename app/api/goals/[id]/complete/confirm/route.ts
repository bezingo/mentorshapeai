import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { awardCompletionBadges } from '@/lib/utils/badges'

/**
 * Schema for mentor confirmation request
 */
const ConfirmCompletionSchema = z.object({
  mentor_feedback: z.string().max(2000).optional(),
})

/**
 * POST /api/goals/[id]/complete/confirm
 * Mentor confirms a goal completion
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
    let body: z.infer<typeof ConfirmCompletionSchema> = {}
    try {
      const rawBody = await request.json()
      body = ConfirmCompletionSchema.parse(rawBody)
    } catch {
      // Body is optional, default to empty
    }

    // Fetch goal completion with collaboration details
    const { data: completion, error: completionError } = await supabase
      .from('goal_completions')
      .select(`
        id,
        goal_id,
        collaboration_id,
        completed_by,
        confirmed_by,
        rating,
        collaboration:collaborations!goal_completions_collaboration_id_fkey(
          id,
          mentor_profile_id,
          mentee_profile_id,
          status
        )
      `)
      .eq('goal_id', goalId)
      .single()

    if (completionError || !completion) {
      if (completionError?.code === 'PGRST116') {
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

    // Check if there's a collaboration
    if (!completion.collaboration) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_COLLABORATION',
            message: 'This goal was completed without a collaboration. No mentor confirmation needed.',
          },
        },
        { status: 400 }
      )
    }

    const collaboration = Array.isArray(completion.collaboration)
      ? completion.collaboration[0]
      : completion.collaboration

    if (!collaboration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
        { status: 404 }
      )
    }

    // Verify the user is the mentor for this collaboration
    if (collaboration.mentor_profile_id !== profile.id) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only the mentor can confirm goal completion',
          },
        },
        { status: 403 }
      )
    }

    // Check if already confirmed
    if (completion.confirmed_by) {
      return NextResponse.json(
        {
          error: {
            code: 'ALREADY_CONFIRMED',
            message: 'This goal completion has already been confirmed',
          },
        },
        { status: 400 }
      )
    }

    // Update completion with confirmation
    const { data: updatedCompletion, error: updateError } = await supabase
      .from('goal_completions')
      .update({
        confirmed_by: profile.id,
        mentor_feedback: body.mentor_feedback || null,
      })
      .eq('id', completion.id)
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
      .single()

    if (updateError) {
      console.error('Error confirming completion:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    // Award badges to the mentor
    let awardedBadgeIds: string[] = []
    try {
      awardedBadgeIds = await awardCompletionBadges(
        profile.id,
        collaboration.id,
        completion.id,
        completion.rating ?? undefined
      )
    } catch (badgeError) {
      console.error('Error awarding badges:', badgeError)
      // Don't fail the request if badge awarding fails
    }

    return NextResponse.json({
      data: {
        ...updatedCompletion,
        message: 'Goal completion confirmed by mentor',
        badges_awarded: awardedBadgeIds.length,
        badge_ids: awardedBadgeIds,
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

    console.error('Error in POST /api/goals/[id]/complete/confirm:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm completion' } },
      { status: 500 }
    )
  }
}
