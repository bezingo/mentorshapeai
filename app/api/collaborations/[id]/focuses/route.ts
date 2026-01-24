import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import {
  BookFocusSchema,
  ListFocusesQuerySchema,
  validateBookingTiming,
  calculateFocusEndTime,
  doFocusTimesOverlap,
} from '@/lib/validations/focus'
import { getZoomClient, createZoomMeeting } from '@/lib/zoom/client'

/**
 * GET /api/collaborations/[id]/focuses
 * List focuses for a collaboration
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

    const { id: collaborationId } = await params
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const queryParams = {
      status: searchParams.get('status') ?? undefined,
      from_date: searchParams.get('from_date') ?? undefined,
      to_date: searchParams.get('to_date') ?? undefined,
      limit: searchParams.get('limit') ?? '50',
      offset: searchParams.get('offset') ?? '0',
    }

    const parseResult = ListFocusesQuerySchema.safeParse(queryParams)
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

    const { status, from_date, to_date, limit = 50, offset = 0 } = parseResult.data

    const supabase = createServiceClient()

    // First, verify the collaboration exists and user has access
    const { data: collaboration, error: collabError } = await supabase
      .from('collaborations')
      .select('id, mentor_profile_id, mentee_profile_id, status')
      .eq('id', collaborationId)
      .single()

    if (collabError || !collaboration) {
      if (collabError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching collaboration:', collabError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch collaboration' } },
        { status: 500 }
      )
    }

    // Verify user has access (must be mentor or mentee)
    const isMentor = collaboration.mentor_profile_id === profile.id
    const isMentee = collaboration.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this collaboration',
          },
        },
        { status: 403 }
      )
    }

    // Build focuses query
    let query = supabase
      .from('focuses')
      .select(
        `
        *,
        cancelled_by_profile:profiles!focuses_cancelled_by_fkey(
          id,
          display_name
        )
      `
      )
      .eq('collaboration_id', collaborationId)
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply date filters
    if (from_date) {
      query = query.gte('scheduled_at', `${from_date}T00:00:00Z`)
    }
    if (to_date) {
      query = query.lte('scheduled_at', `${to_date}T23:59:59Z`)
    }

    const { data: focuses, error: focusesError } = await query

    if (focusesError) {
      console.error('Error fetching focuses:', focusesError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch focuses' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        focuses: focuses || [],
        collaboration_id: collaborationId,
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

    console.error('Error in GET /api/collaborations/[id]/focuses:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch focuses' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/collaborations/[id]/focuses
 * Book a new focus for a collaboration
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

    const { id: collaborationId } = await params
    const body = await request.json()

    // Validate input
    const parseResult = BookFocusSchema.safeParse(body)
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

    const { scheduled_at, duration_minutes, meeting_url, meeting_provider } =
      parseResult.data

    const supabase = createServiceClient()

    // Verify the collaboration exists and is active
    const { data: collaboration, error: collabError } = await supabase
      .from('collaborations')
      .select(
        `
        id,
        mentor_profile_id,
        mentee_profile_id,
        status,
        mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
          id,
          display_name,
          timezone
        ),
        mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
          id,
          display_name
        )
      `
      )
      .eq('id', collaborationId)
      .single()

    if (collabError || !collaboration) {
      if (collabError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching collaboration:', collabError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch collaboration' } },
        { status: 500 }
      )
    }

    // Verify user has access
    const isMentor = collaboration.mentor_profile_id === profile.id
    const isMentee = collaboration.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this collaboration',
          },
        },
        { status: 403 }
      )
    }

    // Check collaboration status - must be accepted or active
    if (!['accepted', 'active'].includes(collaboration.status)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_COLLABORATION_STATUS',
            message: `Cannot book focuses for a collaboration with status '${collaboration.status}'`,
          },
        },
        { status: 400 }
      )
    }

    // Validate booking timing
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

    // Calculate focus end time
    const startTime = new Date(scheduled_at)
    const endTime = calculateFocusEndTime(scheduled_at, duration_minutes)

    // Check for conflicting focuses in this collaboration
    const { data: existingFocuses, error: existingError } = await supabase
      .from('focuses')
      .select('id, scheduled_at, duration_minutes')
      .eq('collaboration_id', collaborationId)
      .eq('status', 'scheduled')

    if (existingError) {
      console.error('Error checking existing focuses:', existingError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to check existing focuses' } },
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

    // Check mentor availability for the requested slot
    // First, get the day of week in mentor's timezone (or UTC if not set)
    const mentorProfile = collaboration.mentor_profile as { timezone?: string } | null
    const mentorTimezone = mentorProfile?.timezone || 'UTC'

    // Get mentor's availability patterns
    const { data: availabilitySlots, error: availError } = await supabase
      .from('mentor_availability')
      .select('day_of_week, start_time, end_time, timezone')
      .eq('profile_id', collaboration.mentor_profile_id)
      .eq('is_active', true)

    if (availError) {
      console.error('Error fetching mentor availability:', availError)
      // Non-fatal - allow booking even if we can't check availability
    }

    // Check if the requested time falls within any availability slot
    // This is a simplified check - for full accuracy, use the /api/mentor/availability/slots endpoint
    if (availabilitySlots && availabilitySlots.length > 0) {
      const requestedDay = startTime.getUTCDay()
      const requestedHour = startTime.getUTCHours()
      const requestedMinute = startTime.getUTCMinutes()
      const requestedTimeMinutes = requestedHour * 60 + requestedMinute

      const hasMatchingSlot = availabilitySlots.some((slot) => {
        if (slot.day_of_week !== requestedDay) return false

        const [slotStartHour, slotStartMinute] = slot.start_time.split(':').map(Number)
        const [slotEndHour, slotEndMinute] = slot.end_time.split(':').map(Number)

        const slotStartMinutes = slotStartHour * 60 + slotStartMinute
        const slotEndMinutes = slotEndHour * 60 + slotEndMinute

        // Check if the requested time falls within this slot
        // Note: This is a simplified check that doesn't account for timezone conversion
        // In production, you'd want to convert times properly using the mentor's timezone
        return (
          requestedTimeMinutes >= slotStartMinutes &&
          requestedTimeMinutes + duration_minutes <= slotEndMinutes
        )
      })

      // Warn if no matching slot, but don't block booking
      // (mentor may have made ad-hoc availability)
      if (!hasMatchingSlot) {
        console.warn(
          `Focus booked outside mentor's regular availability: ${scheduled_at}`
        )
      }
    }

    // Check for mentor's calendar busy blocks
    const { data: busyBlocks, error: busyError } = await supabase
      .from('calendar_busy_blocks')
      .select('id, start_time, end_time')
      .eq('profile_id', collaboration.mentor_profile_id)
      .lte('start_time', endTime.toISOString())
      .gte('end_time', startTime.toISOString())

    if (busyError) {
      console.error('Error checking busy blocks:', busyError)
      // Non-fatal - allow booking even if we can't check busy blocks
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

    // Create the focus
    const { data: newFocus, error: createError } = await supabase
      .from('focuses')
      .insert({
        collaboration_id: collaborationId,
        scheduled_at,
        duration_minutes,
        status: 'scheduled',
        meeting_url: meeting_url || null,
        meeting_provider: meeting_provider || null,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating focus:', createError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: createError.message } },
        { status: 500 }
      )
    }

    // Auto-create Zoom meeting if mentor has Zoom connected
    let zoomMeeting = null
    const mentorProfile = collaboration.mentor_profile as { display_name?: string } | null
    const menteeProfile = collaboration.mentee_profile as { display_name?: string } | null

    try {
      const zoomClient = await getZoomClient(collaboration.mentor_profile_id)

      if (zoomClient) {
        const mentorName = mentorProfile?.display_name || 'Mentor'
        const menteeName = menteeProfile?.display_name || 'Mentee'

        zoomMeeting = await createZoomMeeting(zoomClient, {
          topic: `MentorShape: ${mentorName} + ${menteeName}`,
          start_time: scheduled_at,
          duration: duration_minutes,
          timezone: (collaboration.mentor_profile as { timezone?: string } | null)?.timezone || 'UTC',
          settings: {
            auto_recording: 'cloud',
            join_before_host: true,
            waiting_room: false,
          },
        })

        // Update focus with Zoom meeting details
        await supabase
          .from('focuses')
          .update({
            meeting_id: zoomMeeting.id.toString(),
            meeting_url: zoomMeeting.join_url,
            meeting_provider: 'zoom',
            updated_at: new Date().toISOString(),
          })
          .eq('id', newFocus.id)

        // Update the newFocus object with meeting details
        newFocus.meeting_id = zoomMeeting.id.toString()
        newFocus.meeting_url = zoomMeeting.join_url
        newFocus.meeting_provider = 'zoom'
      }
    } catch (zoomError) {
      // Zoom meeting creation is not critical - log and continue
      console.warn('Failed to create Zoom meeting:', zoomError)
    }

    // TODO: Future integrations:
    // 1. Create Google Calendar events for both mentor and mentee
    // 2. Send notification emails

    return NextResponse.json(
      {
        data: {
          ...newFocus,
          user_role: isMentor ? 'mentor' : 'mentee',
          zoom_created: !!zoomMeeting,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/collaborations/[id]/focuses:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to book focus' } },
      { status: 500 }
    )
  }
}
