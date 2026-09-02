import { NextResponse, NextRequest } from 'next/server'
import { requireMentee, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { restoreGoalVersion } from '@/lib/utils/goal-versioning'

/**
 * POST /api/goals/[id]/versions/[versionId]/restore
 * Restore a goal to a previous version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
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

    const { id, versionId } = await params
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
        { error: { code: 'FORBIDDEN', message: 'Not authorized to modify this goal' } },
        { status: 403 }
      )
    }

    // Verify version belongs to this goal
    const { data: version, error: versionError } = await serviceSupabase
      .from('goal_versions')
      .select('id, goal_id')
      .eq('id', versionId)
      .single()

    if (versionError || !version) {
      return NextResponse.json(
        { error: { code: 'VERSION_NOT_FOUND', message: 'Version not found' } },
        { status: 404 }
      )
    }

    if (version.goal_id !== id) {
      return NextResponse.json(
        { error: { code: 'VERSION_MISMATCH', message: 'Version does not belong to this goal' } },
        { status: 400 }
      )
    }

    // Restore the version
    const success = await restoreGoalVersion(id, versionId)

    if (!success) {
      return NextResponse.json(
        { error: { code: 'RESTORE_FAILED', message: 'Failed to restore version' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: { 
        success: true, 
        message: 'Goal restored to previous version' 
      } 
    })
  } catch (error: any) {
    console.error('Error restoring goal version:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to restore version' } },
      { status: 500 }
    )
  }
}
