import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/collaborations/[id]/progress
 * Get progress scores history for a collaboration
 * 
 * Query params:
 * - limit: number (default 10, max 50)
 * - offset: number (default 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id: collaborationId } = await params
    const supabase = createServiceClient()

    // First verify user has access to this collaboration
    const { data: collaboration, error: collabError } = await supabase
      .from('collaborations')
      .select('id, mentor_profile_id, mentee_profile_id')
      .eq('id', collaborationId)
      .single()

    if (collabError || !collaboration) {
      if (collabError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching collaboration:', collabError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: collabError?.message || 'Failed to fetch' } },
        { status: 500 }
      )
    }

    // Verify user has access (must be mentor or mentee)
    const isMentor = collaboration.mentor_profile_id === profile.id
    const isMentee = collaboration.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this collaboration',
          },
        },
        { status: 403 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Fetch progress scores
    const { data: progressScores, error: scoresError, count } = await supabase
      .from('progress_scores')
      .select('*', { count: 'exact' })
      .eq('collaboration_id', collaborationId)
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (scoresError) {
      console.error('Error fetching progress scores:', scoresError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: scoresError.message } },
        { status: 500 }
      )
    }

    // Get the latest score for quick summary
    const latestScore = progressScores && progressScores.length > 0 ? progressScores[0] : null

    // Calculate trend summary
    let trendSummary = null
    if (progressScores && progressScores.length >= 2) {
      const recentScores = progressScores.slice(0, 5).map((s) => s.score)
      const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      const oldScores = progressScores.slice(5, 10).map((s) => s.score)
      
      if (oldScores.length > 0) {
        const avgOld = oldScores.reduce((a, b) => a + b, 0) / oldScores.length
        const change = avgRecent - avgOld
        trendSummary = {
          recent_average: Math.round(avgRecent),
          previous_average: Math.round(avgOld),
          change: Math.round(change),
          direction: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable',
        }
      }
    }

    return NextResponse.json({
      data: {
        progress_scores: progressScores || [],
        latest: latestScore,
        trend_summary: trendSummary,
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit,
        },
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/collaborations/[id]/progress:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch progress' } },
      { status: 500 }
    )
  }
}
