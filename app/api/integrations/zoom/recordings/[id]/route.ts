import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { getZoomClient, getZoomRecordings } from '@/lib/zoom/client'

/**
 * GET /api/integrations/zoom/recordings/[id]
 * Get recording and transcript URLs for a focus session
 * The [id] parameter is the focus ID
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

    // Get the focus and verify access
    const { data: focus, error: focusError } = await supabase
      .from('focuses')
      .select(
        `
        id,
        collaboration_id,
        meeting_id,
        meeting_url,
        recording_url,
        transcript_url,
        status,
        collaboration:collaborations!inner(
          id,
          mentor_profile_id,
          mentee_profile_id
        )
      `
      )
      .eq('id', focusId)
      .single()

    if (focusError || !focus) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Focus not found' } },
        { status: 404 }
      )
    }

    // Verify user has access to this focus
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

    // If we already have cached recording URLs, return them
    if (focus.recording_url || focus.transcript_url) {
      return NextResponse.json({
        data: {
          focus_id: focusId,
          recording_url: focus.recording_url,
          transcript_url: focus.transcript_url,
          cached: true,
        },
      })
    }

    // Check if focus has a meeting ID
    if (!focus.meeting_id) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_MEETING',
            message: 'This focus does not have a Zoom meeting',
          },
        },
        { status: 400 }
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

    // Get recordings from Zoom API
    let recordings
    try {
      recordings = await getZoomRecordings(zoomClient, focus.meeting_id)
    } catch (error) {
      console.error('Failed to get Zoom recordings:', error)
      return NextResponse.json(
        {
          error: {
            code: 'RECORDINGS_NOT_FOUND',
            message: 'No recordings found for this meeting',
          },
        },
        { status: 404 }
      )
    }

    // Find the video and transcript files
    const videoFile = recordings.recording_files?.find(
      (f) =>
        f.file_type === 'MP4' ||
        f.recording_type === 'shared_screen_with_speaker_view'
    )
    const transcriptFile = recordings.recording_files?.find(
      (f) => f.file_type === 'TRANSCRIPT' || f.recording_type === 'audio_transcript'
    )

    const recordingUrl = videoFile?.play_url || null
    const transcriptUrl = transcriptFile?.download_url || null

    // Cache the URLs in the focus record
    if (recordingUrl || transcriptUrl) {
      await supabase
        .from('focuses')
        .update({
          recording_url: recordingUrl,
          transcript_url: transcriptUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', focusId)
    }

    return NextResponse.json({
      data: {
        focus_id: focusId,
        meeting_id: focus.meeting_id,
        recording_url: recordingUrl,
        transcript_url: transcriptUrl,
        recording_files: recordings.recording_files?.map((f) => ({
          id: f.id,
          file_type: f.file_type,
          recording_type: f.recording_type,
          play_url: f.play_url,
          download_url: f.download_url,
          file_size: f.file_size,
          recording_start: f.recording_start,
          recording_end: f.recording_end,
        })),
        cached: false,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/integrations/zoom/recordings/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get recordings' } },
      { status: 500 }
    )
  }
}
