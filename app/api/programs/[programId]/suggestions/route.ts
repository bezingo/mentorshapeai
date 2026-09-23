import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { ProgramMatchQuerySchema } from '@/lib/validations/organization'
import { getProgramOrgId, requireOrgAdmin, requireOrgMember } from '@/lib/org/access'
import { suggestMentorsForMenteeInProgram } from '@/lib/matching/program-matching'

type RouteContext = { params: Promise<{ programId: string }> }

/**
 * GET /api/programs/[programId]/suggestions — program-scoped mentor rankings
 */
export async function GET(request: NextRequest, context: RouteContext) {
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
        { error: { code: 'FORBIDDEN', message: 'Not a member of this organization' } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const parsed = ProgramMatchQuerySchema.safeParse({
      mentee_profile_id: searchParams.get('mentee_profile_id') ?? undefined,
      limit: searchParams.get('limit') ?? '10',
    })

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message ?? 'Invalid query',
          },
        },
        { status: 400 }
      )
    }

    const menteeProfileId = parsed.data.mentee_profile_id ?? profile.id

    if (menteeProfileId !== profile.id) {
      const admin = await requireOrgAdmin(supabase, orgId, profile.id)
      if (!admin) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Cannot view suggestions for another mentee' } },
          { status: 403 }
        )
      }
    }

    const suggestions = await suggestMentorsForMenteeInProgram(
      supabase,
      programId,
      menteeProfileId,
      parsed.data.limit
    )

    return NextResponse.json({ data: suggestions })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    console.error('GET suggestions:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
