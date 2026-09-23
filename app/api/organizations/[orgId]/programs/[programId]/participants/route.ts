import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { EnrollProgramParticipantSchema } from '@/lib/validations/organization'
import { requireOrgAdmin, requireOrgMember } from '@/lib/org/access'
import { resolveProfileIdByEmail } from '@/lib/org/resolve-profile'

type RouteContext = { params: Promise<{ orgId: string; programId: string }> }

/**
 * GET /api/organizations/[orgId]/programs/[programId]/participants
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { orgId, programId } = await context.params
    const supabase = createServiceClient()

    const membership = await requireOrgMember(supabase, orgId, profile.id)
    if (!membership) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not a member of this organization' } },
        { status: 403 }
      )
    }

    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id, org_id')
      .eq('id', programId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (programError || !program) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Program not found' } },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('program_participants')
      .select(
        `
        id,
        role,
        profile:profiles (
          id,
          display_name,
          avatar_url,
          handle
        )
      `
      )
      .eq('program_id', programId)

    if (error) {
      console.error('List participants error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to list participants' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    console.error('GET participants:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations/[orgId]/programs/[programId]/participants — admin enrolls mentor/mentee
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { orgId, programId } = await context.params
    const supabase = createServiceClient()

    const admin = await requireOrgAdmin(supabase, orgId, profile.id)
    if (!admin) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Organization admin required' } },
        { status: 403 }
      )
    }

    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id, org_id')
      .eq('id', programId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (programError || !program) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Program not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = EnrollProgramParticipantSchema.safeParse(body)
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

    let targetProfileId = parsed.data.profile_id ?? null
    if (!targetProfileId && parsed.data.email) {
      targetProfileId = await resolveProfileIdByEmail(supabase, parsed.data.email)
    }

    if (!targetProfileId) {
      return NextResponse.json(
        {
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'Provide a valid profile_id or registered email',
          },
        },
        { status: 404 }
      )
    }

    const { data: targetMember } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('profile_id', targetProfileId)
      .maybeSingle()

    if (!targetMember) {
      await supabase.from('org_members').insert({
        org_id: orgId,
        profile_id: targetProfileId,
        role: parsed.data.role === 'mentor' ? 'mentor' : 'mentee',
      })
    }

    const { data, error } = await supabase
      .from('program_participants')
      .upsert(
        {
          program_id: programId,
          profile_id: targetProfileId,
          role: parsed.data.role,
        },
        { onConflict: 'program_id,profile_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Enroll participant error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to enroll participant' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    console.error('POST participants:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
