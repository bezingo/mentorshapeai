import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { profile_id, event_type, metadata = {} } = body

    if (!profile_id || !event_type) {
      return NextResponse.json({ error: 'profile_id and event_type are required' }, { status: 400 })
    }

    const validEvents = ['view', 'click', 'share', 'copy_link', 'qr_scan']
    if (!validEvents.includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
    }

    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const referrer = headersList.get('referer') || ''

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('onelink_events')
      .insert({
        profile_id,
        event_type,
        user_agent: userAgent,
        referrer,
        metadata
      })

    if (error) {
      console.error('Error tracking event:', error)
      return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in onelink event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
