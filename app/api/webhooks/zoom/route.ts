import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  verifyZoomWebhookSignature,
  handleZoomUrlValidation,
  getZoomClient,
  getZoomRecordings,
} from '@/lib/zoom/client'
import { enqueueFocusSummaryJob } from '@/lib/jobs/focus-summary-jobs'

/**
 * Zoom webhook event types we handle
 */
type ZoomWebhookEvent =
  | 'endpoint.url_validation'
  | 'meeting.ended'
  | 'recording.completed'

/**
 * Zoom webhook payload structure
 */
interface ZoomWebhookPayload {
  event: ZoomWebhookEvent
  event_ts: number
  payload: {
    plain_token?: string // For URL validation
    account_id?: string
    object?: {
      id?: number | string
      uuid?: string
      host_id?: string
      topic?: string
      start_time?: string
      duration?: number
      end_time?: string
    }
  }
}

/**
 * POST /api/webhooks/zoom
 * Handle Zoom webhook events:
 * - endpoint.url_validation: Respond to Zoom's URL validation challenge
 * - meeting.ended: Mark focus as complete, trigger summary generation
 * - recording.completed: Fetch transcript, store URL
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const body: ZoomWebhookPayload = JSON.parse(rawBody)

    // Handle URL validation (required by Zoom)
    if (body.event === 'endpoint.url_validation') {
      const plainToken = body.payload?.plain_token
      if (!plainToken) {
        return NextResponse.json(
          { error: 'Missing plain_token' },
          { status: 400 }
        )
      }

      const encryptedToken = handleZoomUrlValidation(plainToken)
      return NextResponse.json({
        plainToken,
        encryptedToken,
      })
    }

    // For other events, verify webhook signature
    const signature = request.headers.get('x-zm-signature')
    const timestamp = request.headers.get('x-zm-request-timestamp')

    if (!signature || !timestamp) {
      console.error('Missing Zoom webhook signature headers')
      return NextResponse.json(
        { error: 'Missing signature headers' },
        { status: 401 }
      )
    }

    if (!verifyZoomWebhookSignature(rawBody, signature, timestamp)) {
      console.error('Invalid Zoom webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()

    // Handle meeting.ended event
    if (body.event === 'meeting.ended') {
      const meetingId = body.payload?.object?.id?.toString()
      const endTime = body.payload?.object?.end_time

      if (!meetingId) {
        console.error('Missing meeting ID in webhook payload')
        return NextResponse.json({ received: true })
      }

      // Find the focus by meeting_id
      const { data: focus, error: focusError } = await supabase
        .from('focuses')
        .select('id, collaboration_id, status')
        .eq('meeting_id', meetingId)
        .single()

      if (focusError || !focus) {
        console.log(`No focus found for meeting ID ${meetingId}`)
        return NextResponse.json({ received: true })
      }

      // Only update if focus is scheduled or in_progress
      if (['scheduled', 'in_progress'].includes(focus.status)) {
        await supabase
          .from('focuses')
          .update({
            status: 'completed',
            completed_at: endTime || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', focus.id)

        console.log(`Focus ${focus.id} marked as completed`)

        const { enqueued, jobId } = await enqueueFocusSummaryJob(
          focus.id,
          'meeting.ended'
        )
        if (enqueued) {
          console.log(`Enqueued focus summary job ${jobId} for focus ${focus.id}`)
        }
      }

      return NextResponse.json({ received: true, focus_id: focus.id })
    }

    // Handle recording.completed event
    if (body.event === 'recording.completed') {
      const meetingId = body.payload?.object?.id?.toString()
      const meetingUuid = body.payload?.object?.uuid

      if (!meetingId && !meetingUuid) {
        console.error('Missing meeting ID in recording webhook payload')
        return NextResponse.json({ received: true })
      }

      // Find the focus by meeting_id
      const { data: focus, error: focusError } = await supabase
        .from('focuses')
        .select(
          `
          id,
          collaboration_id,
          meeting_id,
          collaboration:collaborations!inner(
            mentor_profile_id
          )
        `
        )
        .eq('meeting_id', meetingId || meetingUuid)
        .single()

      if (focusError || !focus) {
        console.log(`No focus found for meeting ID ${meetingId || meetingUuid}`)
        return NextResponse.json({ received: true })
      }

      const collaboration = Array.isArray(focus.collaboration)
      ? focus.collaboration[0]
      : focus.collaboration

    if (!collaboration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
        { status: 404 }
      )
    }

      // Get Zoom client for the mentor to fetch recording details
      const zoomClient = await getZoomClient(collaboration.mentor_profile_id)

      if (!zoomClient) {
        console.error('Could not get Zoom client for mentor')
        return NextResponse.json({ received: true })
      }

      try {
        const recordings = await getZoomRecordings(
          zoomClient,
          meetingUuid || meetingId!
        )

        // Find video and transcript files
        const videoFile = recordings.recording_files?.find(
          (f) =>
            f.file_type === 'MP4' ||
            f.recording_type === 'shared_screen_with_speaker_view'
        )
        const transcriptFile = recordings.recording_files?.find(
          (f) =>
            f.file_type === 'TRANSCRIPT' ||
            f.recording_type === 'audio_transcript'
        )

        // Update focus with recording URLs
        await supabase
          .from('focuses')
          .update({
            recording_url: videoFile?.play_url || null,
            transcript_url: transcriptFile?.download_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', focus.id)

        console.log(`Recording URLs updated for focus ${focus.id}`)

        if (transcriptFile?.download_url) {
          const { enqueued, jobId } = await enqueueFocusSummaryJob(
            focus.id,
            'recording.completed'
          )
          if (enqueued) {
            console.log(
              `Enqueued focus summary job ${jobId} for focus ${focus.id} (recording.completed)`
            )
          }
        }
      } catch (error) {
        console.error('Failed to fetch recording details:', error)
      }

      return NextResponse.json({ received: true, focus_id: focus.id })
    }

    // Unknown event - acknowledge receipt
    console.log(`Received unknown Zoom webhook event: ${body.event}`)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing Zoom webhook:', error)
    // Still return 200 to acknowledge receipt and prevent Zoom from retrying
    return NextResponse.json({ received: true, error: 'Processing error' })
  }
}
