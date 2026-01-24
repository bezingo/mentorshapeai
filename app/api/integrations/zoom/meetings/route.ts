import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { getZoomClient, createZoomMeeting } from '@/lib/zoom/client'
import { z } from 'zod'

/**
 * Schema for creating a Zoom meeting
 */
const CreateMeetingSchema = z.object({
  focus_id: z.string().uuid(),
  topic: z.string().min(1).max(200),
  start_time: z.string().datetime(),
  duration: z.number().min(15).max(480).default(60),
  timezone: z.string().optional(),
})

/**
 * POST /api/integrations/zoom/meetings
 * Create a Zoom meeting for a focus session
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate input
    const parseResult = CreateMeetingSchema.safeParse(body)
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

    const { focus_id, topic, start_time, duration, timezone } = parseResult.data

    const supabase = createServiceClient()

    // Get the focus and verify access
    const { data: focus, error: focusError } = await supabase
      .from('focuses')
      .select(
        `
        id,
        collaboration_id,
        scheduled_at,
        duration_minutes,
        meeting_id,
        meeting_url,
        status,
        collaboration:collaborations!inner(
          id,
          mentor_profile_id,
          mentee_profile_id,
          status,
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
      .eq('id', focus_id)
      .single()

    if (focusError || !focus) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Focus not found' } },
        { status: 404 }
      )
    }

    // Verify user has access to this focus
    const collaboration = focus.collaboration as {
      mentor_profile_id: string
      mentee_profile_id: string
      mentor_profile: { id: string; display_name: string } | null
      mentee_profile: { id: string; display_name: string } | null
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

    // Check if meeting already exists
    if (focus.meeting_id && focus.meeting_url) {
      return NextResponse.json(
        {
          error: {
            code: 'MEETING_EXISTS',
            message: 'A Zoom meeting already exists for this focus',
            meeting_url: focus.meeting_url,
          },
        },
        { status: 409 }
      )
    }

    // Get Zoom client for the mentor
    const zoomClient = await getZoomClient(collaboration.mentor_profile_id)

    if (!zoomClient) {
      return NextResponse.json(
        {
          error: {
            code: 'ZOOM_NOT_CONNECTED',
            message: 'Mentor has not connected their Zoom account',
          },
        },
        { status: 400 }
      )
    }

    // Create the Zoom meeting
    const meeting = await createZoomMeeting(zoomClient, {
      topic,
      start_time,
      duration,
      timezone,
      settings: {
        auto_recording: 'cloud',
        join_before_host: true,
        waiting_room: false,
      },
    })

    // Update the focus with meeting details
    const { error: updateError } = await supabase
      .from('focuses')
      .update({
        meeting_id: meeting.id.toString(),
        meeting_url: meeting.join_url,
        meeting_provider: 'zoom',
        updated_at: new Date().toISOString(),
      })
      .eq('id', focus_id)

    if (updateError) {
      console.error('Failed to update focus with meeting details:', updateError)
      // Meeting was created but focus update failed
      // Return success anyway with meeting details
    }

    return NextResponse.json(
      {
        data: {
          meeting_id: meeting.id.toString(),
          join_url: meeting.join_url,
          start_url: meeting.start_url,
          password: meeting.password,
          topic: meeting.topic,
          start_time: meeting.start_time,
          duration: meeting.duration,
          focus_id,
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

    console.error('Error in POST /api/integrations/zoom/meetings:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create Zoom meeting' } },
      { status: 500 }
    )
  }
}
