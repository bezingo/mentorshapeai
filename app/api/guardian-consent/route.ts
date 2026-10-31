import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSession, ensureUserAndProfile } from '@/lib/auth-helpers'
import { sendEmail } from '@/lib/email/client'
import { guardianConsentTemplate } from '@/lib/email/templates'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const RequestConsentSchema = z.object({
  guardian_email: z.string().email(),
  guardian_name: z.string().optional(),
})

function generateConsentToken(): string {
  return randomBytes(32).toString('hex')
}

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

    const { data: consents, error } = await supabase
      .from('guardian_consents')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching consents:', error)
      return NextResponse.json({ error: 'Failed to fetch consents' }, { status: 500 })
    }

    return NextResponse.json({ data: consents })
  } catch (error) {
    console.error('Error in GET /api/guardian-consent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const parsed = RequestConsentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: parsed.error.errors 
      }, { status: 400 })
    }

    const { guardian_email, guardian_name } = parsed.data
    const supabase = createServiceClient()

    const { data: existingPending } = await supabase
      .from('guardian_consents')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('guardian_email', guardian_email)
      .eq('status', 'pending')
      .single()

    if (existingPending) {
      return NextResponse.json({ 
        error: 'A pending consent request already exists for this guardian' 
      }, { status: 409 })
    }

    const { data: affiliation } = await supabase
      .from('affiliations')
      .select('org_id, organization:organizations!inner(name)')
      .eq('profile_id', profile.id)
      .not('verified_at', 'is', null)
      .single()

    const orgId = affiliation?.org_id || null
    const orgName = (affiliation?.organization as unknown as { name: string })?.name || 'Mentorshape'

    const consentToken = generateConsentToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: consent, error } = await supabase
      .from('guardian_consents')
      .insert({
        profile_id: profile.id,
        guardian_email,
        guardian_name,
        consent_token: consentToken,
        org_id: orgId,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating consent:', error)
      return NextResponse.json({ error: 'Failed to create consent request' }, { status: 500 })
    }

    const consentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guardian-consent/${consentToken}`
    const locale = (profile as { locale?: string }).locale || 'en'

    const emailHtml = guardianConsentTemplate({
      guardianName: guardian_name,
      studentName: (profile as { display_name?: string }).display_name || 'Your child',
      orgName,
      consentUrl,
      language: locale
    })

    const emailResult = await sendEmail({
      to: guardian_email,
      subject: locale === 'ar' 
        ? `موافقة ولي الأمر مطلوبة` 
        : `Parental consent required`,
      html: emailHtml
    })

    if (emailResult.success) {
      await supabase
        .from('guardian_consents')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', consent.id)
    }

    return NextResponse.json({ 
      data: consent,
      email_sent: emailResult.success
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/guardian-consent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
