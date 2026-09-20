import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { CreateOrganizationSchema } from '@/lib/validations/organization'
import { generateOrgInviteCode } from '@/lib/org/invite-code'

/**
 * GET /api/organizations — list organizations for the current user
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
      .from('org_members')
      .select(
        `
        role,
        organization:organizations (
          id,
          name,
          type,
          domain,
          logo_url,
          invite_code,
          created_at
        )
      `
      )
      .eq('profile_id', profile.id)

    if (error) {
      console.error('List organizations error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to list organizations' } },
        { status: 500 }
      )
    }

    const organizations = (data ?? [])
      .map((row) => {
        const raw = row.organization
        const org = (Array.isArray(raw) ? raw[0] : raw) as Record<
          string,
          unknown
        > | null
        if (!org) return null
        return {
          ...org,
          member_role: row.role,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ data: organizations })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    console.error('GET /api/organizations:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations — create organization; caller becomes admin
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
    const parsed = CreateOrganizationSchema.safeParse(body)
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
    const inviteCode = generateOrgInviteCode()

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: parsed.data.name,
        type: parsed.data.type ?? null,
        domain: parsed.data.domain ?? null,
        invite_code: inviteCode,
      })
      .select()
      .single()

    if (orgError || !org) {
      console.error('Create organization error:', orgError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to create organization' } },
        { status: 500 }
      )
    }

    const { error: memberError } = await supabase.from('org_members').insert({
      org_id: org.id,
      profile_id: profile.id,
      role: 'admin',
    })

    if (memberError) {
      console.error('Create org admin member error:', memberError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to assign organization admin' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: org }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    console.error('POST /api/organizations:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
