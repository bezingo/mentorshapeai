import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { SelfEnrollProgramSchema } from '@/lib/validations/organization'
import { getProgramOrgId, requireOrgMember } from '@/lib/org/access'

type RouteContext = { params: Promise<{ programId: string }> }

/**
 * POST /api/programs/[programId]/enroll — participant self-enrollment
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

    const { programId } = await context.params
    const supabase = createServiceClient()
    const orgId = await getProgramOrgId(supabase, programId)

    if (!orgId) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Program not found' } },
        { status: 404 }
      )
    }

    const membership = await requireOrgMember(supabase, orgId, profile.id)
    if (!membership) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Join the organization before enrolling' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = SelfEnrollProgramSchema.safeParse(body)
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

    const { data, error } = await supabase
      .from('program_participants')
      .upsert(
        {
          program_id: programId,
          profile_id: profile.id,
          role: parsed.data.role,
        },
        { onConflict: 'program_id,profile_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Self enroll error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to enroll in program' } },
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
    console.error('POST enroll:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
