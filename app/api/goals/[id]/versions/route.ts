import { NextResponse, NextRequest } from 'next/server'
import { requireMentee, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/goals/[id]/versions
 * Get all versions for a goal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id } = await params
    const serviceSupabase = createServiceClient()

    // Verify goal ownership
    const { data: goal, error: fetchError } = await serviceSupabase
      .from('goals')
      .select('id, profile_id')
      .eq('id', id)
      .single()

    if (fetchError || !goal) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    if (goal.profile_id !== profile.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to view this goal' } },
        { status: 403 }
      )
    }

    // Get versions
    const { data: versions, error: versionsError } = await serviceSupabase
      .from('goal_versions')
      .select('*')
      .eq('goal_id', id)
      .order('version_number', { ascending: false })

    if (versionsError) {
      console.error('Error fetching versions:', versionsError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: versionsError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: versions || [] })
  } catch (error: any) {
    console.error('Error fetching goal versions:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch versions' } },
      { status: 500 }
    )
  }
}
