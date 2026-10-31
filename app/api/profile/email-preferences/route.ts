import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSession, ensureUserAndProfile } from '@/lib/auth-helpers'
import { z } from 'zod'

const UpdatePreferencesSchema = z.object({
  digest_enabled: z.boolean().optional(),
  digest_frequency: z.enum(['daily', 'weekly']).optional(),
  digest_hour: z.number().int().min(0).max(23).optional(),
  reminder_email_enabled: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('digest_enabled, digest_frequency, digest_hour, reminder_email_enabled, last_digest_sent_at')
      .eq('id', profile.id)
      .single()

    if (error) {
      console.error('Error fetching preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/profile/email-preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = UpdatePreferencesSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: parsed.error.errors 
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('profiles')
      .update(parsed.data)
      .eq('id', profile.id)
      .select('digest_enabled, digest_frequency, digest_hour, reminder_email_enabled')
      .single()

    if (error) {
      console.error('Error updating preferences:', error)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/profile/email-preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
