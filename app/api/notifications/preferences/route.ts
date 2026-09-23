import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { PatchNotificationPreferencesSchema } from '@/lib/validations/notifications'
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES } from '@/lib/notifications/types'

function buildDefaultPreferences(profileId: string) {
  const defaults: Array<{
    profile_id: string
    channel: string
    type: string
    enabled: boolean
  }> = []

  for (const channel of NOTIFICATION_CHANNELS) {
    for (const type of NOTIFICATION_TYPES) {
      defaults.push({
        profile_id: profileId,
        channel,
        type,
        enabled: channel !== 'sms',
      })
    }
  }

  return defaults
}

/**
 * GET /api/notifications/preferences
 */
export async function GET() {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('channel, type, enabled, updated_at')
      .eq('profile_id', profile.id)

    if (error) {
      console.error('Error fetching notification preferences:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        data: buildDefaultPreferences(profile.id).map(
          ({ profile_id: _pid, ...rest }) => rest
        ),
      })
    }

    return NextResponse.json({ data })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/notifications/preferences:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch notification preferences',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications/preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parseResult = PatchNotificationPreferencesSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0].message,
          },
        },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    const rows = parseResult.data.preferences.map((pref) => ({
      profile_id: profile.id,
      channel: pref.channel,
      type: pref.type,
      enabled: pref.enabled,
      updated_at: now,
    }))

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(rows, { onConflict: 'profile_id,channel,type' })
      .select('channel, type, enabled, updated_at')

    if (error) {
      console.error('Error updating notification preferences:', error)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in PATCH /api/notifications/preferences:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update notification preferences',
        },
      },
      { status: 500 }
    )
  }
}
