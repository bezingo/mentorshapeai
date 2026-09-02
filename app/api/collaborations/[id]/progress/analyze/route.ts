import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { generateAndSaveProgressAnalysis } from '@/lib/ai/progress-tracker'

/**
 * POST /api/collaborations/[id]/progress/analyze
 * Generate AI progress analysis for a collaboration
 * 
 * This endpoint triggers a new progress analysis using AI.
 * The analysis includes score, trend, risk areas, and recommendations.
 */
export async function POST(
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

    // Verify collaboration exists and user has access
    const { data: collaboration, error: collabError } = await supabase
      .from('collaborations')
      .select(`
        id,
        status,
        mentor_profile_id,
        mentee_profile_id,
        goal:goals!collaborations_goal_id_fkey(
          id,
          title
        )
      `)
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

    // Check collaboration is active or accepted
    const validStatuses = ['active', 'accepted']
    if (!validStatuses.includes(collaboration.status)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot analyze progress for collaboration with status '${collaboration.status}'. Collaboration must be active or accepted.`,
          },
        },
        { status: 400 }
      )
    }

    // Check for rate limiting - don't allow analysis more than once per hour
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { data: recentAnalysis } = await supabase
      .from('progress_scores')
      .select('id, generated_at')
      .eq('collaboration_id', collaborationId)
      .gte('generated_at', oneHourAgo.toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (recentAnalysis) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Progress analysis was already generated within the last hour. Please wait before requesting a new analysis.',
            last_analysis_at: recentAnalysis.generated_at,
          },
        },
        { status: 429 }
      )
    }

    // Generate progress analysis
    try {
      const { analysisId, analysis } = await generateAndSaveProgressAnalysis(collaborationId)

      return NextResponse.json({
        data: {
          id: analysisId,
          collaboration_id: collaborationId,
          score: analysis.score,
          trend: analysis.trend,
          analysis: analysis.analysis,
          risk_areas: analysis.risk_areas,
          recommendations: analysis.recommendations,
          predicted_completion_date: analysis.predicted_completion_date,
          generated_at: new Date().toISOString(),
        },
      })
    } catch (aiError) {
      console.error('AI progress analysis error:', aiError)
      return NextResponse.json(
        {
          error: {
            code: 'AI_ANALYSIS_FAILED',
            message: aiError instanceof Error ? aiError.message : 'Failed to generate progress analysis',
          },
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/collaborations/[id]/progress/analyze:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to analyze progress' } },
      { status: 500 }
    )
  }
}
