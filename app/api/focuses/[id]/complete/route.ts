import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { isValidFocusStatusTransition, type FocusStatus } from '@/lib/validations/focus'

/**
 * POST /api/focuses/[id]/complete
 * Mark a focus as complete
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

    const { id: focusId } = await params
    const supabase = createServiceClient()

    // Fetch existing focus with collaboration details
    const { data: focus, error: fetchError } = await supabase
      .from('focuses')
      .select(
        `
        id,
        collaboration_id,
        scheduled_at,
        duration_minutes,
        status,
        collaboration:collaborations!focuses_collaboration_id_fkey(
          id,
          mentor_profile_id,
          mentee_profile_id,
          status
        )
      `
      )
      .eq('id', focusId)
      .single()

    if (fetchError || !focus) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Focus not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching focus:', fetchError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch focus' } },
        { status: 500 }
      )
    }

    // Verify user has access
    const collaboration = focus.collaboration as {
      mentor_profile_id: string
      mentee_profile_id: string
    }

    const isMentor = collaboration.mentor_profile_id === profile.id
    const isMentee = collaboration.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this focus',
          },
        },
        { status: 403 }
      )
    }

    // Validate status transition
    const currentStatus = focus.status as FocusStatus
    const transitionResult = isValidFocusStatusTransition(currentStatus, 'completed')

    if (!transitionResult.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: transitionResult.error,
          },
        },
        { status: 400 }
      )
    }

    // Additional validation: Only allow completion if the scheduled time has passed
    // or if the focus is in_progress
    const scheduledTime = new Date(focus.scheduled_at)
    const endTime = new Date(
      scheduledTime.getTime() + focus.duration_minutes * 60 * 1000
    )
    const now = new Date()

    // Allow completion if:
    // 1. Focus is in_progress, OR
    // 2. Focus is scheduled AND the end time has passed
    if (currentStatus === 'scheduled' && now < endTime) {
      return NextResponse.json(
        {
          error: {
            code: 'FOCUS_NOT_ENDED',
            message: 'Cannot mark focus as complete before the scheduled end time',
          },
        },
        { status: 400 }
      )
    }

    // Update focus to completed
    const { data: completedFocus, error: updateError } = await supabase
      .from('focuses')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', focusId)
      .select(
        `
        *,
        collaboration:collaborations!focuses_collaboration_id_fkey(
          id,
          mentor_profile_id,
          mentee_profile_id,
          status,
          goal:goals!collaborations_goal_id_fkey(
            id,
            title
          ),
          mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
            id,
            display_name
          ),
          mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
            id,
            display_name
          )
        )
      `
      )
      .single()

    if (updateError) {
      console.error('Error completing focus:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    // TODO: Future integrations:
    // 1. Trigger AI summary generation from recording/transcript
    // 2. Send completion notification emails
    // 3. Update progress tracking

    return NextResponse.json({
      data: {
        ...completedFocus,
        user_role: isMentor ? 'mentor' : 'mentee',
        message: 'Focus marked as complete',
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/focuses/[id]/complete:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to complete focus' } },
      { status: 500 }
    )
  }
}
