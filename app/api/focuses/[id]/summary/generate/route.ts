import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { generateAndSaveFocusSummary } from '@/lib/ai/transcript-summarizer'

/**
 * POST /api/focuses/[id]/summary/generate
 * Generate AI summary from transcript
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

    const { id: focusId } = await params
    const supabase = createServiceClient()

    // Fetch focus to verify access and check status
    const { data: focus, error: focusError } = await supabase
      .from('focuses')
      .select(`
        id,
        status,
        scheduled_at,
        transcript_url,
        collaboration:collaborations!focuses_collaboration_id_fkey(
          id,
          mentor_profile_id,
          mentee_profile_id,
          status
        )
      `)
      .eq('id', focusId)
      .single()

    if (focusError || !focus) {
      if (focusError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Focus not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching focus:', focusError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch focus' } },
        { status: 500 }
      )
    }

    // Verify focus is completed (summaries are for completed sessions)
    if (focus.status !== 'completed') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot generate summary for a ${focus.status} focus. Focus must be completed first.`,
          },
        },
        { status: 400 }
      )
    }

    // Verify user has access through the collaboration
    const collaboration = focus.collaboration as {
      id: string
      mentor_profile_id: string
      mentee_profile_id: string
      status: string
    }

    if (!collaboration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Associated collaboration not found' } },
        { status: 404 }
      )
    }

    const isMentor = collaboration.mentor_profile_id === profile.id
    const isMentee = collaboration.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this focus',
          },
        },
        { status: 403 }
      )
    }

    // Check if a summary already exists
    const { data: existingSummary } = await supabase
      .from('focus_summaries')
      .select('id, generated_at')
      .eq('focus_id', focusId)
      .single()

    // Parse request body
    let transcript: string | undefined
    let regenerate = false
    let createActionItems = true

    try {
      const body = await request.json()
      transcript = body.transcript
      regenerate = body.regenerate === true
      createActionItems = body.create_action_items !== false // default true
    } catch {
      // No body or invalid JSON
    }

    // If summary exists and regenerate is not requested, return existing
    if (existingSummary && !regenerate) {
      return NextResponse.json(
        {
          error: {
            code: 'SUMMARY_EXISTS',
            message: 'Summary already exists. Use regenerate=true to regenerate.',
            existing_summary_id: existingSummary.id,
            generated_at: existingSummary.generated_at,
          },
        },
        { status: 409 }
      )
    }

    // Validate transcript
    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'transcript is required in the request body',
          },
        },
        { status: 400 }
      )
    }

    if (transcript.trim().length < 100) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Transcript is too short. Please provide a meaningful transcript (at least 100 characters).',
          },
        },
        { status: 400 }
      )
    }

    // Generate the summary
    try {
      const { summaryId, summary, actionItemIds } = await generateAndSaveFocusSummary(
        focusId,
        transcript,
        createActionItems
      )

      return NextResponse.json({
        data: {
          id: summaryId,
          focus_id: focusId,
          summary: summary.summary,
          key_decisions: summary.key_decisions,
          mentee_action_items: summary.mentee_action_items,
          mentor_action_items: summary.mentor_action_items,
          milestone_updates: summary.milestone_updates,
          overall_sentiment: summary.overall_sentiment,
          session_effectiveness: summary.session_effectiveness,
          generated_at: new Date().toISOString(),
          user_role: isMentor ? 'mentor' : 'mentee',
          action_items_created: actionItemIds.length,
          action_item_ids: actionItemIds,
        },
        message: existingSummary ? 'Summary regenerated successfully' : 'Summary generated successfully',
      })
    } catch (genError) {
      console.error('Error generating summary:', genError)

      // Handle specific AI errors
      if (genError instanceof Error) {
        if (genError.message.includes('rate limit')) {
          return NextResponse.json(
            {
              error: {
                code: 'RATE_LIMITED',
                message: 'AI service is rate limited. Please try again in a few minutes.',
              },
            },
            { status: 429 }
          )
        }
        if (genError.message.includes('timeout')) {
          return NextResponse.json(
            {
              error: {
                code: 'TIMEOUT',
                message: 'Summary generation timed out. Please try again.',
              },
            },
            { status: 504 }
          )
        }
        if (genError.message.includes('API key')) {
          return NextResponse.json(
            {
              error: {
                code: 'CONFIG_ERROR',
                message: 'AI service is not configured correctly.',
              },
            },
            { status: 500 }
          )
        }
        if (genError.message.includes('too short')) {
          return NextResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: genError.message,
              },
            },
            { status: 400 }
          )
        }
      }

      return NextResponse.json(
        {
          error: {
            code: 'GENERATION_FAILED',
            message: genError instanceof Error ? genError.message : 'Failed to generate summary',
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

    console.error('Error in POST /api/focuses/[id]/summary/generate:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate summary' } },
      { status: 500 }
    )
  }
}
