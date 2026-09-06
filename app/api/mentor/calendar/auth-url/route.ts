import { NextResponse } from 'next/server'
import { requireAuth, getCurrentProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { createOAuthState } from '@/lib/crypto/tokens'
import { getAuthorizationUrl } from '@/lib/google/calendar-client'

/**
 * GET /api/mentor/calendar/auth-url
 * Generate Google OAuth URL with calendar.readonly scope
 * Includes state parameter with encrypted profile_id and CSRF token
 */
export async function GET() {
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

    // Check if calendar is already connected
    const { data: existingConnection } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (existingConnection) {
      return NextResponse.json(
        {
          error: {
            code: 'CALENDAR_ALREADY_CONNECTED',
            message: 'A calendar is already connected. Disconnect it first to connect a different account.',
          },
        },
        { status: 409 }
      )
    }

    // Create encrypted state parameter with profile_id and CSRF token
    const state = createOAuthState(profile.id)

    // Generate the Google OAuth URL
    const authUrl = getAuthorizationUrl(state)

    return NextResponse.json({
      data: {
        auth_url: authUrl,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/mentor/calendar/auth-url:', error)

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('ENCRYPTION_KEY')) {
        return NextResponse.json(
          {
            error: {
              code: 'CONFIG_ERROR',
              message: 'Calendar integration is not properly configured',
            },
          },
          { status: 500 }
        )
      }
      if (error.message.includes('GOOGLE_CLIENT')) {
        return NextResponse.json(
          {
            error: {
              code: 'CONFIG_ERROR',
              message: 'Google OAuth is not properly configured',
            },
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate auth URL' } },
      { status: 500 }
    )
  }
}
