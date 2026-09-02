import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getCurrentProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { parseOAuthState, encryptOAuthTokens } from '@/lib/crypto/tokens'
import {
  exchangeCodeForTokens,
  getCalendarClient,
  getPrimaryCalendarId,
  fetchBusyBlocks,
} from '@/lib/google/calendar-client'
import { registerWebhookChannel } from '@/lib/google/calendar-webhooks'

// Redirect URLs
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const SUCCESS_REDIRECT = `${APP_URL}/mentor/onboarding?calendar_connected=true`
const DASHBOARD_REDIRECT = `${APP_URL}/dashboard/mentor/availability?calendar_connected=true`
const ERROR_REDIRECT = `${APP_URL}/mentor/onboarding?calendar_error=true`

/**
 * GET /api/mentor/calendar/callback
 * Handle OAuth callback from Google:
 * 1. Validate state parameter (CSRF protection)
 * 2. Exchange authorization code for tokens
 * 3. Encrypt and store tokens
 * 4. Fetch primary calendar ID
 * 5. Trigger initial sync
 * 6. Register webhook for push notifications
 * 7. Redirect to appropriate page
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      new URL(`${ERROR_REDIRECT}&error_code=${encodeURIComponent(error)}`, APP_URL)
    )
  }

  // Validate required parameters
  if (!code || !state) {
    console.error('Missing code or state parameter')
    return NextResponse.redirect(
      new URL(`${ERROR_REDIRECT}&error_code=missing_params`, APP_URL)
    )
  }

  try {
    // Verify user is authenticated
    await requireAuth()
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.redirect(
        new URL(`${ERROR_REDIRECT}&error_code=unauthorized`, APP_URL)
      )
    }

    // Parse and validate the state parameter
    const parsedState = parseOAuthState(state)

    if (!parsedState) {
      console.error('Invalid or expired state parameter')
      return NextResponse.redirect(
        new URL(`${ERROR_REDIRECT}&error_code=invalid_state`, APP_URL)
      )
    }

    // Verify the state belongs to the current user
    if (parsedState.profile_id !== profile.id) {
      console.error('State profile_id mismatch')
      return NextResponse.redirect(
        new URL(`${ERROR_REDIRECT}&error_code=state_mismatch`, APP_URL)
      )
    }

    const supabase = createServiceClient()

    // Check if calendar is already connected
    const { data: existingConnection } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (existingConnection) {
      // Already connected, redirect to dashboard
      return NextResponse.redirect(new URL(DASHBOARD_REDIRECT, APP_URL))
    }

    // Exchange authorization code for tokens
    let tokens
    try {
      tokens = await exchangeCodeForTokens(code)
    } catch (err) {
      console.error('Failed to exchange code for tokens:', err)
      return NextResponse.redirect(
        new URL(`${ERROR_REDIRECT}&error_code=token_exchange_failed`, APP_URL)
      )
    }

    // Encrypt tokens before storage
    const encryptedTokens = encryptOAuthTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })

    // Store the calendar connection
    const { error: insertError } = await supabase
      .from('calendar_connections')
      .insert({
        profile_id: profile.id,
        provider: 'google',
        access_token: encryptedTokens.access_token,
        refresh_token: encryptedTokens.refresh_token,
        token_expires_at: new Date(tokens.expiry_date).toISOString(),
        connected_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Failed to store calendar connection:', insertError)
      return NextResponse.redirect(
        new URL(`${ERROR_REDIRECT}&error_code=storage_failed`, APP_URL)
      )
    }

    // Get the calendar client and primary calendar ID
    const calendar = await getCalendarClient(profile.id)
    if (!calendar) {
      console.error('Failed to create calendar client after connection')
      return NextResponse.redirect(
        new URL(`${ERROR_REDIRECT}&error_code=client_failed`, APP_URL)
      )
    }

    let calendarId = 'primary'
    try {
      calendarId = await getPrimaryCalendarId(calendar)
    } catch (err) {
      console.warn('Failed to get primary calendar ID, using default:', err)
    }

    // Update connection with calendar ID
    await supabase
      .from('calendar_connections')
      .update({
        calendar_id: calendarId,
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profile.id)

    // Perform initial sync (next 14 days)
    try {
      const now = new Date()
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

      const busyBlocks = await fetchBusyBlocks(
        calendar,
        calendarId,
        now.toISOString(),
        twoWeeksLater.toISOString()
      )

      if (busyBlocks.length > 0) {
        // Insert busy blocks
        const blocksToInsert = busyBlocks.map((block) => ({
          profile_id: profile.id,
          calendar_event_id: block.event_id,
          start_time: block.start,
          end_time: block.end,
          summary: block.summary,
          synced_at: new Date().toISOString(),
        }))

        // Use upsert to handle any duplicates
        await supabase.from('calendar_busy_blocks').upsert(blocksToInsert, {
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
        .eq('profile_id', profile.id)
    } catch (err) {
      // Initial sync is not critical - log and continue
      console.warn('Initial calendar sync failed:', err)
    }

    // Register webhook for push notifications
    try {
      await registerWebhookChannel(profile.id, calendarId)
    } catch (err) {
      // Webhook registration is not critical - log and continue
      console.warn('Webhook registration failed:', err)
    }

    // Update onboarding form_data to mark calendar as connected
    await supabase
      .from('mentor_onboarding_progress')
      .update({
        form_data: supabase.rpc('jsonb_set', {
          target: 'form_data',
          path: '{calendar_connected}',
          value: 'true',
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profile.id)

    // Also try updating via direct JSONB merge
    const { data: onboarding } = await supabase
      .from('mentor_onboarding_progress')
      .select('form_data')
      .eq('profile_id', profile.id)
      .single()

    if (onboarding) {
      await supabase
        .from('mentor_onboarding_progress')
        .update({
          form_data: {
            ...onboarding.form_data,
            calendar_connected: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('profile_id', profile.id)
    }

    // Determine redirect based on whether user is already a mentor
    const redirectUrl = profile.is_mentor ? DASHBOARD_REDIRECT : SUCCESS_REDIRECT

    return NextResponse.redirect(new URL(redirectUrl, APP_URL))
  } catch (error) {
    console.error('Error in GET /api/mentor/calendar/callback:', error)
    return NextResponse.redirect(
      new URL(`${ERROR_REDIRECT}&error_code=internal_error`, APP_URL)
    )
  }
}
