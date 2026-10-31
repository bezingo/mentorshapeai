import { NextResponse, NextRequest } from 'next/server'
import { getSession, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { headers } from 'next/headers'
import { z } from 'zod'

const ConsentSchema = z.object({
  status: z.enum(['granted', 'denied', 'revoked']),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id: focusId } = await params
    const supabase = createServiceClient()

    const { data: focus, error: focusError } = await supabase
      .from('focuses')
      .select(`
        id, status, recording_enabled, has_minor_participant,
        collaboration:collaborations!inner(
          id, mentor_profile_id, mentee_profile_id
        )
      `)
      .eq('id', focusId)
      .single()

    if (focusError || !focus) {
      return NextResponse.json({ error: 'Focus not found' }, { status: 404 })
    }

    const collab = focus.collaboration as unknown as { 
      id: string
      mentor_profile_id: string
      mentee_profile_id: string
    }
    
    const isMentor = collab.mentor_profile_id === profile.id
    const isMentee = collab.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: consents } = await supabase
      .from('focus_recording_consents')
      .select('*')
      .eq('focus_id', focusId)

    const mentorConsent = consents?.find(c => c.profile_id === collab.mentor_profile_id)
    const menteeConsent = consents?.find(c => c.profile_id === collab.mentee_profile_id)

    const { data: eligibility } = await supabase
      .rpc('check_recording_eligibility', { p_focus_id: focusId })

    return NextResponse.json({
      data: {
        focus_id: focusId,
        has_minor_participant: focus.has_minor_participant,
        recording_enabled: focus.recording_enabled,
        user_role: isMentor ? 'mentor' : 'mentee',
        user_consent: isMentor ? mentorConsent : menteeConsent,
        other_consent_status: isMentor 
          ? (menteeConsent?.status || 'pending')
          : (mentorConsent?.status || 'pending'),
        eligibility: eligibility?.[0] || null
      }
    })
  } catch (error) {
    console.error('Error in GET /api/focuses/[id]/consent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id: focusId } = await params
    const body = await request.json()
    const parsed = ConsentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const forwardedFor = headersList.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || null

    const { data: focus, error: focusError } = await supabase
      .from('focuses')
      .select(`
        id, has_minor_participant,
        collaboration:collaborations!inner(
          id, mentor_profile_id, mentee_profile_id
        )
      `)
      .eq('id', focusId)
      .single()

    if (focusError || !focus) {
      return NextResponse.json({ error: 'Focus not found' }, { status: 404 })
    }

    const collab = focus.collaboration as unknown as { 
      id: string
      mentor_profile_id: string
      mentee_profile_id: string
    }
    
    const isMentor = collab.mentor_profile_id === profile.id
    const isMentee = collab.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (focus.has_minor_participant) {
      return NextResponse.json({ 
        error: 'Recording not available - minor participant' 
      }, { status: 400 })
    }

    const { data: existingConsent } = await supabase
      .from('focus_recording_consents')
      .select('id')
      .eq('focus_id', focusId)
      .eq('profile_id', profile.id)
      .single()

    const consentData = {
      status: parsed.data.status,
      user_agent: userAgent,
      ip_address: ipAddress,
      ...(parsed.data.status === 'granted' ? { consented_at: new Date().toISOString() } : {}),
      ...(parsed.data.status === 'revoked' ? { revoked_at: new Date().toISOString() } : {}),
    }

    let consent
    if (existingConsent) {
      const { data, error } = await supabase
        .from('focus_recording_consents')
        .update(consentData)
        .eq('id', existingConsent.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating consent:', error)
        return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 })
      }
      consent = data
    } else {
      const { data, error } = await supabase
        .from('focus_recording_consents')
        .insert({
          focus_id: focusId,
          profile_id: profile.id,
          ...consentData
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating consent:', error)
        return NextResponse.json({ error: 'Failed to save consent' }, { status: 500 })
      }
      consent = data
    }

    const { data: eligibility } = await supabase
      .rpc('check_recording_eligibility', { p_focus_id: focusId })

    const isEligible = eligibility?.[0]?.eligible === true

    if (isEligible) {
      await supabase
        .from('focuses')
        .update({ recording_enabled: true })
        .eq('id', focusId)
    } else {
      await supabase
        .from('focuses')
        .update({ recording_enabled: false })
        .eq('id', focusId)
    }

    return NextResponse.json({
      data: {
        consent,
        recording_eligible: isEligible,
        eligibility: eligibility?.[0] || null
      }
    })
  } catch (error) {
    console.error('Error in POST /api/focuses/[id]/consent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
