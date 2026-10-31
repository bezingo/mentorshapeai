import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { headers } from 'next/headers'
import { z } from 'zod'

const RespondSchema = z.object({
  decision: z.enum(['approve', 'deny']),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createServiceClient()

    const { data: consent, error } = await supabase
      .from('guardian_consents')
      .select(`
        *,
        profile:profiles!inner(
          id, display_name, avatar_url,
          organization:affiliations(
            organization:organizations!inner(id, name)
          )
        )
      `)
      .eq('consent_token', token)
      .single()

    if (error || !consent) {
      return NextResponse.json({ error: 'Consent request not found' }, { status: 404 })
    }

    if (consent.status !== 'pending') {
      return NextResponse.json({ 
        data: { 
          status: consent.status,
          responded_at: consent.responded_at,
          message: consent.status === 'approved' 
            ? 'Consent has already been approved' 
            : 'This consent request has already been processed'
        }
      })
    }

    if (new Date(consent.expires_at) < new Date()) {
      await supabase
        .from('guardian_consents')
        .update({ status: 'expired' })
        .eq('id', consent.id)

      return NextResponse.json({ 
        error: 'This consent request has expired' 
      }, { status: 410 })
    }

    const profile = consent.profile as {
      id: string
      display_name: string | null
      avatar_url: string | null
      organization?: Array<{ organization: { id: string; name: string } }>
    }

    return NextResponse.json({
      data: {
        student_name: profile.display_name,
        student_avatar: profile.avatar_url,
        org_name: profile.organization?.[0]?.organization?.name || 'Mentorshape',
        guardian_name: consent.guardian_name,
        expires_at: consent.expires_at,
        status: consent.status
      }
    })
  } catch (error) {
    console.error('Error in GET /api/guardian-consent/[token]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const parsed = RespondSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const forwardedFor = headersList.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || null

    const { data: consent, error } = await supabase
      .from('guardian_consents')
      .select('*')
      .eq('consent_token', token)
      .single()

    if (error || !consent) {
      return NextResponse.json({ error: 'Consent request not found' }, { status: 404 })
    }

    if (consent.status !== 'pending') {
      return NextResponse.json({ 
        error: 'This consent request has already been processed' 
      }, { status: 400 })
    }

    if (new Date(consent.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'This consent request has expired' 
      }, { status: 410 })
    }

    const newStatus = parsed.data.decision === 'approve' ? 'approved' : 'denied'

    const { error: updateError } = await supabase
      .from('guardian_consents')
      .update({
        status: newStatus,
        responded_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .eq('id', consent.id)

    if (updateError) {
      console.error('Error updating consent:', updateError)
      return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 })
    }

    if (newStatus === 'approved') {
      await supabase
        .from('profiles')
        .update({
          parent_consent_given: true,
          parent_consent_given_at: new Date().toISOString(),
          parent_email: consent.guardian_email
        })
        .eq('id', consent.profile_id)
    }

    return NextResponse.json({
      data: {
        status: newStatus,
        message: newStatus === 'approved'
          ? 'Thank you! Consent has been granted.'
          : 'Consent has been denied.'
      }
    })
  } catch (error) {
    console.error('Error in POST /api/guardian-consent/[token]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
