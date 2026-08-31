import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

/**
 * Schema for submitting consent
 */
const ConsentSchema = z.object({
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  consent_given: z.boolean(),
  parent_email: z.string().email().optional().nullable(),
})

/**
 * GET /api/safeguarding/consent
 * Get current consent status
 */
export async function GET() {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const supabase = createServiceClient()

    // Fetch profile consent data
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('date_of_birth, consent_given, consent_given_at, parent_email, parent_consent_given, parent_consent_given_at')
      .eq('id', profile.id)
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch consent status' } },
        { status: 500 }
      )
    }

    // Check if user is in an org that requires consent
    const { data: membership } = await supabase
      .from('org_members')
      .select(`
        org:organizations!org_members_org_id_fkey(
          require_consent,
          min_age
        )
      `)
      .eq('profile_id', profile.id)
      .limit(1)
      .single()

    const org = membership ? (Array.isArray(membership.org) ? membership.org[0] : membership.org) : null
    const requireConsent = org?.require_consent ?? false
    const minAge = org?.min_age ?? 13

    // Calculate age if date of birth is set
    let age: number | null = null
    let isMinor = false

    if (profileData.date_of_birth) {
      const dob = new Date(profileData.date_of_birth)
      const today = new Date()
      age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--
      }
      isMinor = age < 18
    }

    // Determine if user can proceed
    const canProceed = !requireConsent || (
      profileData.consent_given &&
      (!isMinor || profileData.parent_consent_given) &&
      (age === null || age >= minAge)
    )

    return NextResponse.json({
      data: {
        date_of_birth: profileData.date_of_birth,
        age,
        is_minor: isMinor,
        consent_given: profileData.consent_given,
        consent_given_at: profileData.consent_given_at,
        parent_email: profileData.parent_email,
        parent_consent_given: profileData.parent_consent_given,
        parent_consent_given_at: profileData.parent_consent_given_at,
        require_consent: requireConsent,
        min_age: minAge,
        can_proceed: canProceed,
        blocking_reason: !canProceed
          ? !profileData.consent_given
            ? 'User consent required'
            : isMinor && !profileData.parent_consent_given
            ? 'Parent/guardian consent required'
            : age !== null && age < minAge
            ? `Minimum age is ${minAge}`
            : null
          : null,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/safeguarding/consent:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch consent status' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/safeguarding/consent
 * Submit consent
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const supabase = createServiceClient()

    // Parse and validate request
    const body = await request.json()
    const parseResult = ConsentSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0].message,
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const { date_of_birth, consent_given, parent_email } = parseResult.data

    // Validate age
    const dob = new Date(date_of_birth)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }

    // Check org requirements
    const { data: membership } = await supabase
      .from('org_members')
      .select(`
        org:organizations!org_members_org_id_fkey(min_age)
      `)
      .eq('profile_id', profile.id)
      .limit(1)
      .single()

    const org = membership ? (Array.isArray(membership.org) ? membership.org[0] : membership.org) : null
    const minAge = org?.min_age ?? 13

    if (age < minAge) {
      return NextResponse.json(
        {
          error: {
            code: 'AGE_REQUIREMENT',
            message: `You must be at least ${minAge} years old to participate`,
          },
        },
        { status: 400 }
      )
    }

    const isMinor = age < 18

    // Update profile
    const updateData: Record<string, unknown> = {
      date_of_birth,
      consent_given,
      consent_given_at: consent_given ? new Date().toISOString() : null,
    }

    if (isMinor && parent_email) {
      updateData.parent_email = parent_email
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error updating consent:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: 'Failed to save consent' } },
        { status: 500 }
      )
    }

    // If minor, they need parent consent before proceeding
    const canProceed = consent_given && !isMinor

    return NextResponse.json({
      data: {
        consent_saved: true,
        is_minor: isMinor,
        can_proceed: canProceed,
        parent_consent_required: isMinor,
        message: isMinor
          ? 'Consent saved. Parent/guardian consent is required before you can participate.'
          : 'Consent saved. You can now participate in mentorship.',
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/safeguarding/consent:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to save consent' } },
      { status: 500 }
    )
  }
}
