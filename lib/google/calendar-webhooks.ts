import { calendar_v3 } from 'googleapis'
import * as crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { getCalendarClient } from './calendar-client'

/**
 * Google Calendar Webhook (Push Notifications) utilities
 * Handles channel registration and renewal for real-time calendar sync
 */

// Webhook endpoint URL - must be publicly accessible over HTTPS
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mentor/calendar/webhook`
  : null

// Channel expiration time (7 days in milliseconds - Google's maximum)
const CHANNEL_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Generate a unique channel ID for webhook registration
 * Format: cal-{profileId}-{random}
 */
function generateChannelId(profileId: string): string {
  const random = crypto.randomBytes(8).toString('hex')
  return `cal-${profileId.substring(0, 8)}-${random}`
}

/**
 * Register a webhook channel for calendar push notifications
 *
 * @param profileId - The user's profile ID
 * @param calendarId - The calendar ID to watch
 * @returns The channel registration info, or null if failed
 */
export async function registerWebhookChannel(
  profileId: string,
  calendarId: string
): Promise<{
  channel_id: string
  expiration: Date
} | null> {
  if (!WEBHOOK_URL) {
    console.warn('WEBHOOK_URL not configured - skipping webhook registration')
    return null
  }

  // Get the calendar client
  const calendar = await getCalendarClient(profileId)
  if (!calendar) {
    console.error('Failed to get calendar client for webhook registration')
    return null
  }

  const channelId = generateChannelId(profileId)
  const expiration = Date.now() + CHANNEL_EXPIRATION_MS

  try {
    // Register the watch channel
    const response = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: WEBHOOK_URL,
        expiration: String(expiration),
      },
    })

    if (!response.data.id || !response.data.expiration) {
      console.error('Invalid webhook registration response:', response.data)
      return null
    }

    // Store the channel info in the database
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('calendar_connections')
      .update({
        webhook_channel_id: response.data.id,
        webhook_expiration: new Date(Number(response.data.expiration)).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId)

    if (error) {
      console.error('Failed to store webhook channel info:', error)
      // Try to stop the channel since we couldn't store it
      await stopWebhookChannel(calendar, response.data.id, response.data.resourceId || '')
      return null
    }

    return {
      channel_id: response.data.id,
      expiration: new Date(Number(response.data.expiration)),
    }
  } catch (err) {
    console.error('Failed to register webhook channel:', err)
    return null
  }
}

/**
 * Stop a webhook channel
 *
 * @param calendar - Authenticated Calendar API client
 * @param channelId - The channel ID to stop
 * @param resourceId - The resource ID from the watch response
 */
export async function stopWebhookChannel(
  calendar: calendar_v3.Calendar,
  channelId: string,
  resourceId: string
): Promise<boolean> {
  try {
    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId,
      },
    })
    return true
  } catch (err) {
    // Channel may already be stopped or expired
    console.warn('Failed to stop webhook channel:', err)
    return false
  }
}

/**
 * Stop the webhook channel for a user
 *
 * @param profileId - The user's profile ID
 */
export async function stopWebhookChannelForProfile(
  profileId: string
): Promise<boolean> {
  const supabase = createServiceClient()

  // Get the current channel info
  const { data: connection, error } = await supabase
    .from('calendar_connections')
    .select('webhook_channel_id, calendar_id')
    .eq('profile_id', profileId)
    .single()

  if (error || !connection?.webhook_channel_id) {
    return true // No channel to stop
  }

  // Get the calendar client
  const calendar = await getCalendarClient(profileId)
  if (!calendar) {
    return false
  }

  // Note: We need the resourceId to stop the channel, but we don't store it
  // The channel will eventually expire on its own (max 7 days)
  // For now, just clear the database entry
  await supabase
    .from('calendar_connections')
    .update({
      webhook_channel_id: null,
      webhook_expiration: null,
      updated_at: new Date().toISOString(),
    })
    .eq('profile_id', profileId)

  return true
}

/**
 * Check if a webhook channel needs renewal
 *
 * @param webhookExpiration - The current channel expiration date
 * @returns true if the channel expires in less than 1 day
 */
export function needsRenewal(webhookExpiration: Date | string): boolean {
  const expiration =
    typeof webhookExpiration === 'string'
      ? new Date(webhookExpiration)
      : webhookExpiration

  const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000
  return expiration.getTime() < oneDayFromNow
}

/**
 * Renew a webhook channel if it's about to expire
 *
 * @param profileId - The user's profile ID
 * @returns The new channel info, or null if not needed or failed
 */
export async function renewWebhookChannelIfNeeded(
  profileId: string
): Promise<{
  channel_id: string
  expiration: Date
} | null> {
  const supabase = createServiceClient()

  // Get the current connection info
  const { data: connection, error } = await supabase
    .from('calendar_connections')
    .select('webhook_expiration, calendar_id')
    .eq('profile_id', profileId)
    .single()

  if (error || !connection) {
    return null
  }

  // Check if renewal is needed
  if (connection.webhook_expiration && !needsRenewal(connection.webhook_expiration)) {
    return null // No renewal needed
  }

  // Register a new channel
  const calendarId = connection.calendar_id || 'primary'
  return registerWebhookChannel(profileId, calendarId)
}

/**
 * Find the profile ID associated with a webhook channel ID
 *
 * @param channelId - The webhook channel ID
 * @returns The profile ID, or null if not found
 */
export async function findProfileByChannelId(
  channelId: string
): Promise<string | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('calendar_connections')
    .select('profile_id')
    .eq('webhook_channel_id', channelId)
    .single()

  if (error || !data) {
    return null
  }

  return data.profile_id
}

/**
 * Get all connections with webhooks that need renewal
 * Used for scheduled renewal jobs
 *
 * @returns Array of profile IDs that need webhook renewal
 */
export async function getConnectionsNeedingRenewal(): Promise<string[]> {
  const supabase = createServiceClient()

  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('calendar_connections')
    .select('profile_id')
    .lt('webhook_expiration', oneDayFromNow)
    .not('webhook_expiration', 'is', null)

  if (error || !data) {
    return []
  }

  return data.map((d) => d.profile_id)
}
