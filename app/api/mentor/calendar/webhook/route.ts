import { NextRequest, NextResponse } from 'next/server'
import { findProfileByChannelId } from '@/lib/google/calendar-webhooks'
import { syncCalendarForProfile } from '../sync/route'

/**
 * Rate limiting state (in-memory for simplicity)
 * In production, use Redis or similar for distributed rate limiting
 */
const syncInProgress = new Map<string, number>()
const SYNC_COOLDOWN_MS = 10000 // 10 seconds between syncs for same user

/**
 * POST /api/mentor/calendar/webhook
 * Receive Google Calendar push notifications
 *
 * Note: This endpoint must be publicly accessible (no auth)
 * Google will call this endpoint when calendar events change
 *
 * Google sends the following headers:
 * - X-Goog-Channel-ID: The channel ID we registered
 * - X-Goog-Resource-ID: The resource being watched
 * - X-Goog-Resource-State: 'sync' (initial) or 'exists' (changes)
 * - X-Goog-Message-Number: Incrementing message number
 */
export async function POST(request: NextRequest) {
  try {
    // Extract Google webhook headers
    const channelId = request.headers.get('x-goog-channel-id')
    const resourceId = request.headers.get('x-goog-resource-id')
    const resourceState = request.headers.get('x-goog-resource-state')
    const messageNumber = request.headers.get('x-goog-message-number')

    // Log for debugging (in production, use proper logging)
    console.log('Calendar webhook received:', {
      channelId,
      resourceId,
      resourceState,
      messageNumber,
    })

    // Validate required headers
    if (!channelId) {
      console.warn('Webhook missing channel ID')
      // Return 200 to prevent Google from retrying
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Look up the profile associated with this channel
    const profileId = await findProfileByChannelId(channelId)

    if (!profileId) {
      console.warn('No profile found for channel:', channelId)
      // Return 200 - the channel may have been deleted
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Handle different resource states
    if (resourceState === 'sync') {
      // Initial sync notification - just acknowledge
      console.log('Webhook sync notification for profile:', profileId)
      return NextResponse.json({ received: true, state: 'sync' }, { status: 200 })
    }

    // Check rate limiting (prevent rapid successive syncs)
    const lastSyncTime = syncInProgress.get(profileId)
    const now = Date.now()

    if (lastSyncTime && now - lastSyncTime < SYNC_COOLDOWN_MS) {
      console.log('Skipping sync due to cooldown for profile:', profileId)
      return NextResponse.json(
        { received: true, state: 'rate_limited' },
        { status: 200 }
      )
    }

    // Mark sync as in progress
    syncInProgress.set(profileId, now)

    // Trigger sync in background (don't await to return quickly)
    // Google expects a response within 10 seconds
    syncCalendarForProfile(profileId)
      .then((result) => {
        if (result.success) {
          console.log('Webhook-triggered sync completed:', {
            profileId,
            busyBlocks: result.busyBlocksCount,
          })
        } else {
          console.warn('Webhook-triggered sync failed:', {
            profileId,
            error: result.error,
          })
        }
      })
      .catch((err) => {
        console.error('Webhook-triggered sync error:', err)
      })
      .finally(() => {
        // Clean up after cooldown period
        setTimeout(() => {
          syncInProgress.delete(profileId)
        }, SYNC_COOLDOWN_MS)
      })

    // Return 200 immediately to acknowledge receipt
    return NextResponse.json(
      {
        received: true,
        state: resourceState,
        sync_triggered: true,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in POST /api/mentor/calendar/webhook:', error)
    // Always return 200 to prevent Google from retrying
    return NextResponse.json(
      { received: true, error: 'Processing error' },
      { status: 200 }
    )
  }
}

/**
 * Handle GET requests (for webhook verification if needed)
 * Some webhook systems require a GET endpoint for verification
 */
export async function GET() {
  return NextResponse.json(
    { status: 'ok', endpoint: 'calendar-webhook' },
    { status: 200 }
  )
}
