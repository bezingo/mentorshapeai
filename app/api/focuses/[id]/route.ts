import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import {
  UpdateFocusSchema,
  canCancelFocus,
  canRescheduleFocus,
  validateBookingTiming,
  calculateFocusEndTime,
  doFocusTimesOverlap,
  getFocusStatusTimestamps,
  type FocusStatus,
} from '@/lib/validations/focus'

/**
 * GET /api/focuses/[id]
 * Get focus details with agenda and summary
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

    const { id: focusId } = await params
    const supabase = createServiceClient()

    // Fetch focus with related data
    const { data: focus, error: focusError } = await supabase
      .from('focuses')
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
            title,
            description,
            category
          ),
          mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
            id,
            display_name,
            avatar_url,
            handle,
            timezone
          ),
          mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
            id,
            display_name,
            avatar_url,
            handle,
            timezone
          )
        ),
        cancelled_by_profile:profiles!focuses_cancelled_by_fkey(
          id,
          display_name
        ),
        agenda:focus_agendas!focus_agendas_focus_id_fkey(
          id,
          topics,
          questions,
          previous_action_items,
          preparation_tips,
          mentee_notes,
          mentor_notes,
          generated_at
        ),
        summary:focus_summaries!focus_summaries_focus_id_fkey(
          id,
          summary,
          key_decisions,
          mentee_action_items,
          mentor_action_items,
          milestone_updates,
          mood_rating,
          generated_at
        )
      `
      )
      .eq('id', focusId)
      .single()

    if (focusError || !focus) {
      if (focusError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Focus not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching focus:', focusError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch focus' } },
        { status: 500 }
      )
    }

    // Verify user has access
    const collaboration = Array.isArray(focus.collaboration)
      ? focus.collaboration[0]
      : focus.collaboration

    if (!collaboration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
        { status: 404 }
      )
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

    // Process agenda and summary (they may be arrays from the join)
    const agenda = Array.isArray(focus.agenda) ? focus.agenda[0] : focus.agenda
    const summary = Array.isArray(focus.summary) ? focus.summary[0] : focus.summary

    return NextResponse.json({
      data: {
        ...focus,
        agenda: agenda || null,
        summary: summary || null,
        user_role: isMentor ? 'mentor' : 'mentee',
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/focuses/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch focus' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/focuses/[id]
 * Update focus (reschedule, cancel)
 */
export async function PATCH(
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
    const body = await request.json()

    // Validate input
    const parseResult = UpdateFocusSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0].message,
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const { scheduled_at, status: newStatus, cancellation_reason, meeting_url } =
      parseResult.data

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
    const collaboration = Array.isArray(focus.collaboration)
      ? focus.collaboration[0]
      : focus.collaboration

    if (!collaboration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
        { status: 404 }
      )
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

    const currentStatus = focus.status as FocusStatus

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Handle cancellation
    if (newStatus === 'cancelled') {
      if (!canCancelFocus(currentStatus)) {
        return NextResponse.json(
          {
            error: {
              code: 'CANNOT_CANCEL',
              message: `Cannot cancel a focus with status '${currentStatus}'`,
            },
          },
          { status: 400 }
        )
      }

      updateData.status = 'cancelled'
      const timestamps = getFocusStatusTimestamps('cancelled', profile.id)
      Object.assign(updateData, timestamps)

      if (cancellation_reason) {
        // Store cancellation reason in a metadata field if needed
        // For now, we just log it
        console.log(`Focus ${focusId} cancelled. Reason: ${cancellation_reason}`)
      }
    }

    // Handle rescheduling
    if (scheduled_at) {
      if (!canRescheduleFocus(currentStatus)) {
        return NextResponse.json(
          {
            error: {
              code: 'CANNOT_RESCHEDULE',
              message: `Cannot reschedule a focus with status '${currentStatus}'`,
            },
          },
          { status: 400 }
        )
      }

      // Validate new timing
      const timingValidation = validateBookingTiming(scheduled_at)
      if (!timingValidation.valid) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_BOOKING_TIME',
              message: timingValidation.error,
            },
          },
          { status: 400 }
        )
      }

      // Check for conflicts with other focuses
      const startTime = new Date(scheduled_at)
      const endTime = calculateFocusEndTime(scheduled_at, focus.duration_minutes)

      const { data: existingFocuses, error: existingError } = await supabase
        .from('focuses')
        .select('id, scheduled_at, duration_minutes')
        .eq('collaboration_id', focus.collaboration_id)
        .eq('status', 'scheduled')
        .neq('id', focusId) // Exclude the current focus

      if (existingError) {
        console.error('Error checking existing focuses:', existingError)
        return NextResponse.json(
          {
            error: {
              code: 'FETCH_FAILED',
              message: 'Failed to check existing focuses',
            },
          },
          { status: 500 }
        )
      }

      // Check for overlapping focuses
      for (const existingFocus of existingFocuses || []) {
        const existingStart = new Date(existingFocus.scheduled_at)
        const existingEnd = calculateFocusEndTime(
          existingFocus.scheduled_at,
          existingFocus.duration_minutes
        )

        if (doFocusTimesOverlap(startTime, endTime, existingStart, existingEnd)) {
          return NextResponse.json(
            {
              error: {
                code: 'FOCUS_CONFLICT',
                message: 'A focus is already scheduled at this time',
                conflicting_focus_id: existingFocus.id,
              },
            },
            { status: 409 }
          )
        }
      }

      // Check mentor's calendar busy blocks
      const { data: busyBlocks, error: busyError } = await supabase
        .from('calendar_busy_blocks')
        .select('id, start_time, end_time')
        .eq('profile_id', collaboration.mentor_profile_id)
        .lte('start_time', endTime.toISOString())
        .gte('end_time', startTime.toISOString())

      if (busyError) {
        console.error('Error checking busy blocks:', busyError)
        // Non-fatal
      }

      if (busyBlocks && busyBlocks.length > 0) {
        return NextResponse.json(
          {
            error: {
              code: 'MENTOR_BUSY',
              message: 'The mentor has a calendar conflict at this time',
            },
          },
          { status: 409 }
        )
      }

      updateData.scheduled_at = scheduled_at
    }

    // Handle meeting URL update
    if (meeting_url !== undefined) {
      updateData.meeting_url = meeting_url
    }

    // Perform update
    const { data: updatedFocus, error: updateError } = await supabase
      .from('focuses')
      .update(updateData)
      .eq('id', focusId)
      .select(
        `
        *,
        cancelled_by_profile:profiles!focuses_cancelled_by_fkey(
          id,
          display_name
        )
      `
      )
      .single()

    if (updateError) {
      console.error('Error updating focus:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    // TODO: Future integrations:
    // 1. Update Zoom meeting if rescheduled
    // 2. Update Google Calendar events
    // 3. Send notification emails for reschedule/cancellation

    return NextResponse.json({
      data: {
        ...updatedFocus,
        user_role: isMentor ? 'mentor' : 'mentee',
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in PATCH /api/focuses/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update focus' } },
      { status: 500 }
    )
  }
}
