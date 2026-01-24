import { google, calendar_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { createServiceClient } from '@/lib/supabase/service'
import { encryptOAuthTokens, decryptOAuthTokens } from '@/lib/crypto/tokens'

/**
 * Google Calendar API client wrapper
 * Handles OAuth token management with automatic refresh
 */

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mentor/calendar/callback`
  : 'http://localhost:3000/api/mentor/calendar/callback'

// OAuth scopes for calendar access
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
]

/**
 * Create a base OAuth2 client without credentials
 */
export function createOAuth2Client(): OAuth2Client {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Missing Google OAuth environment variables. ' +
        'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
    )
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  )
}

/**
 * Generate the Google OAuth authorization URL
 *
 * @param state - Encrypted state parameter containing profile_id and CSRF token
 * @returns The authorization URL to redirect the user to
 */
export function getAuthorizationUrl(state: string): string {
  const oauth2Client = createOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: CALENDAR_SCOPES,
    state,
    prompt: 'consent', // Force consent screen to get refresh token
    include_granted_scopes: true,
  })
}

/**
 * Exchange authorization code for tokens
 *
 * @param code - The authorization code from the OAuth callback
 * @returns Object containing tokens and expiry
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expiry_date: number
}> {
  const oauth2Client = createOAuth2Client()

  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens: missing access_token or refresh_token')
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000, // Default 1 hour
  }
}

/**
 * Create an authenticated Google Calendar client for a user
 *
 * @param profileId - The user's profile ID
 * @returns Authenticated Calendar API client, or null if no connection exists
 */
export async function getCalendarClient(
  profileId: string
): Promise<calendar_v3.Calendar | null> {
  const supabase = createServiceClient()

  // Fetch the user's calendar connection
  const { data: connection, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('profile_id', profileId)
    .single()

  if (error || !connection) {
    return null
  }

  // Decrypt tokens
  const tokens = decryptOAuthTokens({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
  })

  // Create OAuth client with tokens
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: new Date(connection.token_expires_at).getTime(),
  })

  // Handle automatic token refresh
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.access_token) {
      // Encrypt and store the new tokens
      const encryptedTokens = encryptOAuthTokens({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || tokens.refresh_token,
      })

      await supabase
        .from('calendar_connections')
        .update({
          access_token: encryptedTokens.access_token,
          refresh_token: encryptedTokens.refresh_token,
          token_expires_at: new Date(
            newTokens.expiry_date || Date.now() + 3600 * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('profile_id', profileId)
    }
  })

  // Check if token needs refresh
  const now = Date.now()
  const expiryTime = new Date(connection.token_expires_at).getTime()

  // Refresh if token expires in less than 5 minutes
  if (expiryTime - now < 5 * 60 * 1000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      oauth2Client.setCredentials(credentials)
    } catch {
      // Token refresh failed - connection may be invalid
      console.error('Failed to refresh Google Calendar token')
      return null
    }
  }

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

/**
 * Get the primary calendar ID for a user
 *
 * @param calendar - Authenticated Calendar API client
 * @returns The primary calendar ID (usually the user's email)
 */
export async function getPrimaryCalendarId(
  calendar: calendar_v3.Calendar
): Promise<string> {
  const response = await calendar.calendarList.list({
    minAccessRole: 'reader',
  })

  const primaryCalendar = response.data.items?.find(
    (cal) => cal.primary === true
  )

  return primaryCalendar?.id || 'primary'
}

/**
 * Fetch busy blocks from Google Calendar for a date range
 *
 * @param calendar - Authenticated Calendar API client
 * @param calendarId - The calendar ID to query
 * @param timeMin - Start of the date range (ISO string)
 * @param timeMax - End of the date range (ISO string)
 * @returns Array of busy blocks with start/end times
 */
export async function fetchBusyBlocks(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<
  Array<{
    event_id: string
    start: string
    end: string
    summary?: string
  }>
> {
  // Use events.list to get events with details
  const response = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true, // Expand recurring events
    orderBy: 'startTime',
    maxResults: 2500, // Maximum allowed
  })

  const busyBlocks: Array<{
    event_id: string
    start: string
    end: string
    summary?: string
  }> = []

  if (response.data.items) {
    for (const event of response.data.items) {
      // Skip cancelled events
      if (event.status === 'cancelled') continue

      // Skip events where user has declined
      if (event.attendees) {
        const userAttendee = event.attendees.find((a) => a.self === true)
        if (userAttendee?.responseStatus === 'declined') continue
      }

      // Get start and end times
      const start = event.start?.dateTime || event.start?.date
      const end = event.end?.dateTime || event.end?.date

      if (start && end && event.id) {
        // For all-day events, the date format is YYYY-MM-DD
        // Convert to ISO format for consistency
        const startISO = event.start?.dateTime
          ? start
          : new Date(start).toISOString()
        const endISO = event.end?.dateTime
          ? end
          : new Date(end).toISOString()

        busyBlocks.push({
          event_id: event.id,
          start: startISO,
          end: endISO,
          summary: event.summary || undefined,
        })
      }
    }
  }

  return busyBlocks
}

/**
 * Revoke Google OAuth access tokens
 *
 * @param accessToken - The access token to revoke
 */
export async function revokeToken(accessToken: string): Promise<void> {
  const oauth2Client = createOAuth2Client()

  try {
    await oauth2Client.revokeToken(accessToken)
  } catch {
    // Token may already be invalid, which is fine
    console.warn('Failed to revoke Google token - it may already be invalid')
  }
}

/**
 * Validate that tokens are still valid by making a test API call
 *
 * @param calendar - Authenticated Calendar API client
 * @returns true if the connection is valid
 */
export async function validateConnection(
  calendar: calendar_v3.Calendar
): Promise<boolean> {
  try {
    await calendar.calendarList.list({
      maxResults: 1,
    })
    return true
  } catch {
    return false
  }
}
