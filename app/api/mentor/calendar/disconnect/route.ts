import { NextResponse } from 'next/server'
import { requireAuth, getCurrentProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { decryptToken } from '@/lib/crypto/tokens'
import { revokeToken } from '@/lib/google/calendar-client'
import { stopWebhookChannelForProfile } from '@/lib/google/calendar-webhooks'

/**
 * DELETE /api/mentor/calendar/disconnect
 * Remove calendar connection:
 * 1. Stop webhook channel
 * 2. Revoke Google OAuth tokens
 * 3. Delete calendar_busy_blocks
 * 4. Delete calendar_connections record
 */
export async function DELETE() {
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

    // Stop the webhook channel (if one exists)
    try {
      await stopWebhookChannelForProfile(profile.id)
    } catch (err) {
      console.warn('Failed to stop webhook channel:', err)
      // Continue with disconnection even if webhook stop fails
    }

    // Revoke the Google OAuth token
    try {
      const accessToken = decryptToken(connection.access_token)
      await revokeToken(accessToken)
    } catch (err) {
      console.warn('Failed to revoke Google token:', err)
      // Continue with disconnection even if revocation fails
      // The token may already be invalid
    }

    // Delete all busy blocks for this user
    const { error: deleteBlocksError } = await supabase
      .from('calendar_busy_blocks')
      .delete()
      .eq('profile_id', profile.id)

    if (deleteBlocksError) {
      console.warn('Failed to delete busy blocks:', deleteBlocksError)
      // Continue - this is not critical
    }

    // Delete the calendar connection
    const { error: deleteConnectionError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('profile_id', profile.id)

    if (deleteConnectionError) {
      console.error('Failed to delete calendar connection:', deleteConnectionError)
      return NextResponse.json(
        { error: { code: 'DELETE_FAILED', message: 'Failed to delete calendar connection' } },
        { status: 500 }
      )
    }

    // Update onboarding progress if exists
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
            calendar_connected: false,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('profile_id', profile.id)
    }

    return NextResponse.json({
      data: {
        message: 'Calendar disconnected successfully',
        disconnected_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error in DELETE /api/mentor/calendar/disconnect:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to disconnect calendar' } },
      { status: 500 }
    )
  }
}
