import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getCurrentProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { parseOAuthState, encryptOAuthTokens } from '@/lib/crypto/tokens'
import {
  exchangeZoomCodeForTokens,
  getZoomUserProfile,
} from '@/lib/zoom/client'

// Redirect URLs
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const SUCCESS_REDIRECT = `${APP_URL}/dashboard/mentor/settings?zoom_connected=true`
const ERROR_REDIRECT = `${APP_URL}/dashboard/mentor/settings?zoom_error=true`

/**
 * GET /api/integrations/zoom/callback
 * Handle OAuth callback from Zoom:
 * 1. Validate state parameter (CSRF protection)
 * 2. Exchange authorization code for tokens
 * 3. Get Zoom user profile
 * 4. Encrypt and store tokens
 * 5. Redirect to appropriate page
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('Zoom OAuth error:', error)
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

    // Only mentors can connect Zoom
    if (!profile.is_mentor) {
      return NextResponse.redirect(
        new URL(`${ERROR_REDIRECT}&error_code=not_mentor`, APP_URL)
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

    // Check if Zoom is already connected
    const { data: existingConnection } = await supabase
      .from('zoom_connections')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (existingConnection) {
      // Already connected, redirect to dashboard
      return NextResponse.redirect(new URL(SUCCESS_REDIRECT, APP_URL))
    }

    // Exchange authorization code for tokens
    let tokens
    try {
      tokens = await exchangeZoomCodeForTokens(code)
    } catch (err) {
      console.error('Failed to exchange code for tokens:', err)
      return NextResponse.redirect(
        new URL(`${ERROR_REDIRECT}&error_code=token_exchange_failed`, APP_URL)
      )
    }

    // Get the Zoom user profile
    let zoomUser
    try {
      zoomUser = await getZoomUserProfile(tokens.access_token)
    } catch (err) {
      console.error('Failed to get Zoom user profile:', err)
      return NextResponse.redirect(
        new URL(`${ERROR_REDIRECT}&error_code=profile_fetch_failed`, APP_URL)
      )
    }

    // Encrypt tokens before storage
    const encryptedTokens = encryptOAuthTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })

    // Calculate token expiry
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString()

    // Parse scopes
    const scopes = tokens.scope ? tokens.scope.split(' ') : []

    // Store the Zoom connection
    const { error: insertError } = await supabase
      .from('zoom_connections')
      .insert({
        profile_id: profile.id,
        zoom_user_id: zoomUser.id,
        access_token: encryptedTokens.access_token,
        refresh_token: encryptedTokens.refresh_token,
        token_expires_at: tokenExpiresAt,
        scopes,
        connected_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Failed to store Zoom connection:', insertError)
      return NextResponse.redirect(
        new URL(`${ERROR_REDIRECT}&error_code=storage_failed`, APP_URL)
      )
    }

    return NextResponse.redirect(new URL(SUCCESS_REDIRECT, APP_URL))
  } catch (error) {
    console.error('Error in GET /api/integrations/zoom/callback:', error)
    return NextResponse.redirect(
      new URL(`${ERROR_REDIRECT}&error_code=internal_error`, APP_URL)
    )
  }
}
