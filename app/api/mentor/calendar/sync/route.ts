import { NextResponse } from 'next/server'
import { requireAuth, getCurrentProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { getCalendarClient, fetchBusyBlocks } from '@/lib/google/calendar-client'
import { renewWebhookChannelIfNeeded } from '@/lib/google/calendar-webhooks'

// Number of days to sync ahead
const SYNC_DAYS_AHEAD = 14

/**
 * POST /api/mentor/calendar/sync
 * Manual sync trigger:
 * 1. Fetch busy/free from Google Calendar
 * 2. Update calendar_busy_blocks table
 * 3. Renew webhook if needed
 * 4. Update last_sync_at timestamp
 */
export async function POST() {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()

    // Get the calendar connection
    const { data: connection, error: fetchError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('profile_id', profile.id)
      .single()

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: { code: 'CALENDAR_NOT_CONNECTED', message: 'No calendar is connected' } },
        { status: 400 }
      )
    }

    // Get the calendar client
    const calendar = await getCalendarClient(profile.id)
    if (!calendar) {
      return NextResponse.json(
        { error: { code: 'CALENDAR_AUTH_FAILED', message: 'Calendar authentication failed. Please reconnect.' } },
        { status: 401 }
      )
    }

    const calendarId = connection.calendar_id || 'primary'
    const now = new Date()
    const syncEndDate = new Date(now.getTime() + SYNC_DAYS_AHEAD * 24 * 60 * 60 * 1000)

    // Fetch busy blocks from Google Calendar
    let busyBlocks
    try {
      busyBlocks = await fetchBusyBlocks(
        calendar,
        calendarId,
        now.toISOString(),
        syncEndDate.toISOString()
      )
    } catch (err) {
      console.error('Failed to fetch busy blocks:', err)
      return NextResponse.json(
        { error: { code: 'SYNC_FAILED', message: 'Failed to fetch calendar data' } },
        { status: 500 }
      )
    }

    // Delete old busy blocks (before now) and blocks outside our sync window
    const { error: deleteError } = await supabase
      .from('calendar_busy_blocks')
      .delete()
      .eq('profile_id', profile.id)
      .or(`end_time.lt.${now.toISOString()},start_time.gt.${syncEndDate.toISOString()}`)

    if (deleteError) {
      console.warn('Failed to delete old busy blocks:', deleteError)
    }

    // Get existing busy blocks to determine what to update vs insert
    const { data: existingBlocks } = await supabase
      .from('calendar_busy_blocks')
      .select('calendar_event_id')
      .eq('profile_id', profile.id)

    const existingEventIds = new Set(existingBlocks?.map((b) => b.calendar_event_id) || [])
    const newEventIds = new Set(busyBlocks.map((b) => b.event_id))

    // Delete blocks that no longer exist in Google Calendar
    const blocksToDelete = [...existingEventIds].filter((id) => !newEventIds.has(id))
    if (blocksToDelete.length > 0) {
      await supabase
        .from('calendar_busy_blocks')
        .delete()
        .eq('profile_id', profile.id)
        .in('calendar_event_id', blocksToDelete)
    }

    // Upsert all busy blocks
    if (busyBlocks.length > 0) {
      const blocksToUpsert = busyBlocks.map((block) => ({
        profile_id: profile.id,
        calendar_event_id: block.event_id,
        start_time: block.start,
        end_time: block.end,
        summary: block.summary,
        synced_at: new Date().toISOString(),
      }))

      const { error: upsertError } = await supabase
        .from('calendar_busy_blocks')
        .upsert(blocksToUpsert, {
          onConflict: 'profile_id,calendar_event_id',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error('Failed to upsert busy blocks:', upsertError)
        return NextResponse.json(
          { error: { code: 'SYNC_FAILED', message: 'Failed to save calendar data' } },
          { status: 500 }
        )
      }
    }

    // Update last_sync_at
    const { error: updateError } = await supabase
      .from('calendar_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profile.id)

    if (updateError) {
      console.warn('Failed to update last_sync_at:', updateError)
    }

    // Check and renew webhook if needed
    try {
      await renewWebhookChannelIfNeeded(profile.id)
    } catch (err) {
      console.warn('Failed to renew webhook channel:', err)
    }

    return NextResponse.json({
      data: {
        message: 'Calendar synced successfully',
        synced_at: new Date().toISOString(),
        busy_blocks_count: busyBlocks.length,
        sync_window: {
          start: now.toISOString(),
          end: syncEndDate.toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('Error in POST /api/mentor/calendar/sync:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to sync calendar' } },
      { status: 500 }
    )
  }
}

/**
 * Internal function to sync calendar for a profile
 * Can be called from the webhook handler
 */
export async function syncCalendarForProfile(profileId: string): Promise<{
  success: boolean
  busyBlocksCount?: number
  error?: string
}> {
  const supabase = createServiceClient()

  // Get the calendar connection
  const { data: connection, error: fetchError } = await supabase
    .from('calendar_connections')
    .select('calendar_id')
    .eq('profile_id', profileId)
    .single()

  if (fetchError || !connection) {
    return { success: false, error: 'No calendar connection found' }
  }

  // Get the calendar client
  const calendar = await getCalendarClient(profileId)
  if (!calendar) {
    return { success: false, error: 'Calendar authentication failed' }
  }

  const calendarId = connection.calendar_id || 'primary'
  const now = new Date()
  const syncEndDate = new Date(now.getTime() + SYNC_DAYS_AHEAD * 24 * 60 * 60 * 1000)

  try {
    const busyBlocks = await fetchBusyBlocks(
      calendar,
      calendarId,
      now.toISOString(),
      syncEndDate.toISOString()
    )

    // Delete old blocks
    await supabase
      .from('calendar_busy_blocks')
      .delete()
      .eq('profile_id', profileId)
      .lt('end_time', now.toISOString())

    // Upsert busy blocks
    if (busyBlocks.length > 0) {
      const blocksToUpsert = busyBlocks.map((block) => ({
        profile_id: profileId,
        calendar_event_id: block.event_id,
        start_time: block.start,
        end_time: block.end,
        summary: block.summary,
        synced_at: new Date().toISOString(),
      }))

      await supabase.from('calendar_busy_blocks').upsert(blocksToUpsert, {
        onConflict: 'profile_id,calendar_event_id',
        ignoreDuplicates: false,
      })
    }

    // Update last_sync_at
    await supabase
      .from('calendar_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId)

    return { success: true, busyBlocksCount: busyBlocks.length }
  } catch (err) {
    console.error('Calendar sync failed:', err)
    return { success: false, error: 'Sync failed' }
  }
}
