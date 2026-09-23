import { NextResponse } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { getProgramOrgId, requireOrgAdmin } from '@/lib/org/access'
import { runProgramMatching } from '@/lib/matching/program-matching'

type RouteContext = { params: Promise<{ programId: string }> }

/**
 * POST /api/programs/[programId]/match — org admin triggers AI matching for program
 */
export async function POST(_request: Request, context: RouteContext) {
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

    const admin = await requireOrgAdmin(supabase, orgId, profile.id)
    if (!admin) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Organization admin required' } },
        { status: 403 }
      )
    }

    const result = await runProgramMatching(supabase, programId)

    const { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .eq('program_id', programId)
      .order('match_score', { ascending: false })

    if (error) {
      console.error('Fetch matches after run error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Matching ran but failed to load results' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        summary: result,
        matches,
      },
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    console.error('POST match:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
