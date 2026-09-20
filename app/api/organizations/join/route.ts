import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { JoinOrganizationSchema } from '@/lib/validations/organization'
import { currentUser } from '@clerk/nextjs/server'

/**
 * POST /api/organizations/join — join via invite code (optional domain auto-match)
 */
export async function POST(request: NextRequest) {
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
    const parsed = JoinOrganizationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message ?? 'Invalid request',
            details: parsed.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, domain, invite_code')
      .eq('invite_code', parsed.data.invite_code)
      .maybeSingle()

    if (orgError) {
      console.error('Join org lookup error:', orgError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to look up organization' } },
        { status: 500 }
      )
    }

    if (!org) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Invalid invite code' } },
        { status: 404 }
      )
    }

    if (org.domain) {
      const clerkUser = await currentUser()
      const email =
        clerkUser?.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        )?.emailAddress ?? ''
      const emailDomain = email.split('@')[1]?.toLowerCase()
      if (emailDomain && emailDomain !== org.domain.toLowerCase()) {
        return NextResponse.json(
          {
            error: {
              code: 'DOMAIN_MISMATCH',
              message: `This organization requires an email at @${org.domain}`,
            },
          },
          { status: 403 }
        )
      }
    }

    const orgMemberRole =
      parsed.data.role === 'mentor' ? ('mentor' as const) : ('mentee' as const)

    const { data: membership, error: memberError } = await supabase
      .from('org_members')
      .upsert(
        {
          org_id: org.id,
          profile_id: profile.id,
          role: orgMemberRole,
        },
        { onConflict: 'org_id,profile_id' }
      )
      .select()
      .single()

    if (memberError) {
      console.error('Join org member error:', memberError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to join organization' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        organization: org,
        membership,
      },
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    console.error('POST /api/organizations/join:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
