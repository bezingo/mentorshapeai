import { NextResponse } from 'next/server'
import { requireAuth, getCurrentProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { createOAuthState } from '@/lib/crypto/tokens'
import { getZoomAuthorizationUrl } from '@/lib/zoom/client'

/**
 * GET /api/integrations/zoom/auth-url
 * Generate Zoom OAuth URL with meeting:write and recording:read scopes
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

    // Only mentors can connect Zoom
    if (!profile.is_mentor) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only mentors can connect Zoom',
          },
        },
        { status: 403 }
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
      return NextResponse.json(
        {
          error: {
            code: 'ZOOM_ALREADY_CONNECTED',
            message:
              'Zoom is already connected. Disconnect it first to connect a different account.',
          },
        },
        { status: 409 }
      )
    }

    // Create encrypted state parameter with profile_id and CSRF token
    const state = createOAuthState(profile.id)

    // Generate the Zoom OAuth URL
    const authUrl = getZoomAuthorizationUrl(state)

    return NextResponse.json({
      data: {
        auth_url: authUrl,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/integrations/zoom/auth-url:', error)

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('ENCRYPTION_KEY')) {
        return NextResponse.json(
          {
            error: {
              code: 'CONFIG_ERROR',
              message: 'Zoom integration is not properly configured',
            },
          },
          { status: 500 }
        )
      }
      if (error.message.includes('ZOOM_CLIENT')) {
        return NextResponse.json(
          {
            error: {
              code: 'CONFIG_ERROR',
              message: 'Zoom OAuth is not properly configured',
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
