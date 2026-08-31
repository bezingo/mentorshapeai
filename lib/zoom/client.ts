import { createServiceClient } from '@/lib/supabase/service'
import { encryptOAuthTokens, decryptOAuthTokens } from '@/lib/crypto/tokens'

/**
 * Zoom API client wrapper
 * Handles OAuth token management with automatic refresh
 */

// Zoom OAuth configuration
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET
const ZOOM_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/zoom/callback`
  : 'http://localhost:3000/api/integrations/zoom/callback'

// Zoom API base URL
const ZOOM_API_BASE = 'https://api.zoom.us/v2'
const ZOOM_OAUTH_URL = 'https://zoom.us/oauth'

// OAuth scopes for meeting and recording access
export const ZOOM_SCOPES = ['meeting:write', 'recording:read']

/**
 * Validate Zoom OAuth environment variables
 */
function validateZoomConfig(): void {
  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error(
      'Missing Zoom OAuth environment variables. ' +
        'Please set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET.'
    )
  }
}

/**
 * Generate the Zoom OAuth authorization URL
 *
 * @param state - Encrypted state parameter containing profile_id and CSRF token
 * @returns The authorization URL to redirect the user to
 */
export function getZoomAuthorizationUrl(state: string): string {
  validateZoomConfig()

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ZOOM_CLIENT_ID!,
    redirect_uri: ZOOM_REDIRECT_URI,
    state,
  })

  return `${ZOOM_OAUTH_URL}/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 *
 * @param code - The authorization code from the OAuth callback
 * @returns Object containing tokens, expiry, and user info
 */
export async function exchangeZoomCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}> {
  validateZoomConfig()

  const credentials = Buffer.from(
    `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`
  ).toString('base64')

  const response = await fetch(`${ZOOM_OAUTH_URL}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: ZOOM_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Zoom token exchange failed:', error)
    throw new Error('Failed to exchange code for tokens')
  }

  return response.json()
}

/**
 * Refresh Zoom access token using refresh token
 *
 * @param refreshToken - The refresh token
 * @returns New tokens
 */
export async function refreshZoomToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}> {
  validateZoomConfig()

  const credentials = Buffer.from(
    `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`
  ).toString('base64')

  const response = await fetch(`${ZOOM_OAUTH_URL}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Zoom token refresh failed:', error)
    throw new Error('Failed to refresh Zoom token')
  }

  return response.json()
}

/**
 * Get the current user's Zoom profile
 *
 * @param accessToken - Valid Zoom access token
 * @returns Zoom user profile
 */
export async function getZoomUserProfile(accessToken: string): Promise<{
  id: string
  email: string
  first_name: string
  last_name: string
  display_name: string
  account_id: string
  type: number
}> {
  const response = await fetch(`${ZOOM_API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to get Zoom user profile:', error)
    throw new Error('Failed to get Zoom user profile')
  }

  return response.json()
}

/**
 * Zoom API client interface
 */
export interface ZoomClient {
  accessToken: string
  profileId: string
}

/**
 * Get an authenticated Zoom client for a user
 * Handles automatic token refresh if needed
 *
 * @param profileId - The user's profile ID
 * @returns Zoom client with valid access token, or null if no connection exists
 */
export async function getZoomClient(
  profileId: string
): Promise<ZoomClient | null> {
  const supabase = createServiceClient()

  // Fetch the user's Zoom connection
  const { data: connection, error } = await supabase
    .from('zoom_connections')
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

  // Check if token needs refresh (5 minutes buffer)
  const now = Date.now()
  const expiryTime = new Date(connection.token_expires_at).getTime()

  if (expiryTime - now < 5 * 60 * 1000) {
    try {
      const newTokens = await refreshZoomToken(tokens.refresh_token)

      // Encrypt and store new tokens
      const encryptedTokens = encryptOAuthTokens({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
      })

      await supabase
        .from('zoom_connections')
        .update({
          access_token: encryptedTokens.access_token,
          refresh_token: encryptedTokens.refresh_token,
          token_expires_at: new Date(
            Date.now() + newTokens.expires_in * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('profile_id', profileId)

      return {
        accessToken: newTokens.access_token,
        profileId,
      }
    } catch {
      console.error('Failed to refresh Zoom token')
      return null
    }
  }

  return {
    accessToken: tokens.access_token,
    profileId,
  }
}

/**
 * Meeting settings for creating a Zoom meeting
 */
export interface CreateMeetingParams {
  topic: string
  start_time: string // ISO 8601 format
  duration: number // minutes
  timezone?: string
  settings?: {
    auto_recording?: 'local' | 'cloud' | 'none'
    join_before_host?: boolean
    waiting_room?: boolean
    mute_upon_entry?: boolean
  }
}

/**
 * Zoom meeting response
 */
export interface ZoomMeeting {
  id: number
  uuid: string
  host_id: string
  host_email: string
  topic: string
  status: string
  start_time: string
  duration: number
  timezone: string
  created_at: string
  join_url: string
  start_url: string
  password: string
}

/**
 * Create a Zoom meeting
 *
 * @param client - Authenticated Zoom client
 * @param params - Meeting parameters
 * @returns Created meeting details
 */
export async function createZoomMeeting(
  client: ZoomClient,
  params: CreateMeetingParams
): Promise<ZoomMeeting> {
  const response = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${client.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: params.topic,
      type: 2, // Scheduled meeting
      start_time: params.start_time,
      duration: params.duration,
      timezone: params.timezone || 'UTC',
      settings: {
        auto_recording: params.settings?.auto_recording || 'none',
        join_before_host: params.settings?.join_before_host ?? true,
        waiting_room: params.settings?.waiting_room ?? false,
        mute_upon_entry: params.settings?.mute_upon_entry ?? false,
        host_video: true,
        participant_video: true,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to create Zoom meeting:', error)
    throw new Error('Failed to create Zoom meeting')
  }

  // Update last_used_at
  const supabase = createServiceClient()
  await supabase
    .from('zoom_connections')
    .update({
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('profile_id', client.profileId)

  return response.json()
}

/**
 * Get a Zoom meeting by ID
 *
 * @param client - Authenticated Zoom client
 * @param meetingId - The meeting ID
 * @returns Meeting details
 */
export async function getZoomMeeting(
  client: ZoomClient,
  meetingId: string
): Promise<ZoomMeeting> {
  const response = await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}`, {
    headers: {
      Authorization: `Bearer ${client.accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to get Zoom meeting:', error)
    throw new Error('Failed to get Zoom meeting')
  }

  return response.json()
}

/**
 * Delete a Zoom meeting
 *
 * @param client - Authenticated Zoom client
 * @param meetingId - The meeting ID to delete
 */
export async function deleteZoomMeeting(
  client: ZoomClient,
  meetingId: string
): Promise<void> {
  const response = await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${client.accessToken}`,
    },
  })

  if (!response.ok && response.status !== 204) {
    const error = await response.text()
    console.error('Failed to delete Zoom meeting:', error)
    throw new Error('Failed to delete Zoom meeting')
  }
}

/**
 * Update a Zoom meeting
 *
 * @param client - Authenticated Zoom client
 * @param meetingId - The meeting ID
 * @param params - Updated meeting parameters
 */
export async function updateZoomMeeting(
  client: ZoomClient,
  meetingId: string,
  params: Partial<CreateMeetingParams>
): Promise<void> {
  const response = await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${client.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: params.topic,
      start_time: params.start_time,
      duration: params.duration,
      timezone: params.timezone,
    }),
  })

  if (!response.ok && response.status !== 204) {
    const error = await response.text()
    console.error('Failed to update Zoom meeting:', error)
    throw new Error('Failed to update Zoom meeting')
  }
}

/**
 * Recording file information
 */
export interface ZoomRecordingFile {
  id: string
  meeting_id: string
  recording_start: string
  recording_end: string
  file_type: string
  file_extension: string
  file_size: number
  play_url: string
  download_url: string
  status: string
  recording_type: string
}

/**
 * Recording information
 */
export interface ZoomRecording {
  uuid: string
  id: number
  account_id: string
  host_id: string
  topic: string
  start_time: string
  duration: number
  total_size: number
  recording_count: number
  recording_files: ZoomRecordingFile[]
}

/**
 * Get recordings for a meeting
 *
 * @param client - Authenticated Zoom client
 * @param meetingId - The meeting ID or UUID
 * @returns Recording details with file URLs
 */
export async function getZoomRecordings(
  client: ZoomClient,
  meetingId: string
): Promise<ZoomRecording> {
  // Double-encode UUID if it contains / or //
  const encodedMeetingId = meetingId.includes('/')
    ? encodeURIComponent(encodeURIComponent(meetingId))
    : meetingId

  const response = await fetch(
    `${ZOOM_API_BASE}/meetings/${encodedMeetingId}/recordings`,
    {
      headers: {
        Authorization: `Bearer ${client.accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to get Zoom recordings:', error)
    throw new Error('Failed to get Zoom recordings')
  }

  return response.json()
}

/**
 * Revoke Zoom OAuth access
 *
 * @param accessToken - The access token to revoke
 */
export async function revokeZoomToken(accessToken: string): Promise<void> {
  validateZoomConfig()

  const credentials = Buffer.from(
    `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`
  ).toString('base64')

  try {
    await fetch(`${ZOOM_OAUTH_URL}/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: accessToken,
      }),
    })
  } catch {
    // Token may already be invalid, which is fine
    console.warn('Failed to revoke Zoom token - it may already be invalid')
  }
}

/**
 * Validate that Zoom connection is still valid
 *
 * @param client - Zoom client to validate
 * @returns true if the connection is valid
 */
export async function validateZoomConnection(
  client: ZoomClient
): Promise<boolean> {
  try {
    await getZoomUserProfile(client.accessToken)
    return true
  } catch {
    return false
  }
}

/**
 * Verify Zoom webhook signature
 *
 * @param payload - Request body as string
 * @param signature - x-zm-signature header
 * @param timestamp - x-zm-request-timestamp header
 * @returns true if signature is valid
 */
export function verifyZoomWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const webhookSecret = process.env.ZOOM_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('ZOOM_WEBHOOK_SECRET not configured')
    return false
  }

  const crypto = require('crypto')
  const message = `v0:${timestamp}:${payload}`
  const hashForVerify = crypto
    .createHmac('sha256', webhookSecret)
    .update(message)
    .digest('hex')
  const expectedSignature = `v0=${hashForVerify}`

  return signature === expectedSignature
}

/**
 * Handle Zoom URL validation challenge
 * Required for webhook endpoint verification
 *
 * @param plainToken - The plain_token from Zoom's validation request
 * @returns The encrypted_token for response
 */
export function handleZoomUrlValidation(plainToken: string): string {
  const webhookSecret = process.env.ZOOM_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('ZOOM_WEBHOOK_SECRET not configured')
  }

  const crypto = require('crypto')
  return crypto
    .createHmac('sha256', webhookSecret)
    .update(plainToken)
    .digest('hex')
}
