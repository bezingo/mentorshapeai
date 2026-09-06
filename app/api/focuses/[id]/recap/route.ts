import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import {
  generateAndSaveSummaryFromNotes,
  generateHtmlRecap,
} from '@/lib/ai/notes-summarizer'

/**
 * POST /api/focuses/[id]/recap
 * Generate a recap from notes (no transcript required)
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
        collaboration:collaborations!focuses_collaboration_id_fkey(
          id,
          mentor_profile_id,
          mentee_profile_id,
          goal:goals!collaborations_goal_id_fkey(title),
          mentor_profile:profiles!collaborations_mentor_profile_id_fkey(display_name),
          mentee_profile:profiles!collaborations_mentee_profile_id_fkey(display_name)
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

    // Verify focus is completed
    if (focus.status !== 'completed') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot generate recap for a ${focus.status} focus. Focus must be completed first.`,
          },
        },
        { status: 400 }
      )
    }

    // Verify user has access
    const collaboration = Array.isArray(focus.collaboration)
      ? focus.collaboration[0]
      : focus.collaboration

    if (!collaboration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
        { status: 404 }
      )
    }

    const isMentor = collaboration.mentor_profile_id === profile.id
    const isMentee = collaboration.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You do not have access to this focus' } },
        { status: 403 }
      )
    }

    // Check for existing summary
    const { data: existingSummary } = await supabase
      .from('focus_summaries')
      .select('id, generated_at')
      .eq('focus_id', focusId)
      .single()

    // Parse request body
    let menteeNotes: string | undefined
    let mentorNotes: string | undefined
    let regenerate = false
    let createActionItems = true
    let format: 'json' | 'html' = 'json'

    try {
      const body = await request.json()
      menteeNotes = body.mentee_notes
      mentorNotes = body.mentor_notes
      regenerate = body.regenerate === true
      createActionItems = body.create_action_items !== false
      format = body.format === 'html' ? 'html' : 'json'
    } catch {
      // No body or invalid JSON - will use notes from focus_agendas
    }

    // If summary exists and regenerate is not requested, return existing
    if (existingSummary && !regenerate) {
      return NextResponse.json(
        {
          error: {
            code: 'SUMMARY_EXISTS',
            message: 'Recap already exists. Use regenerate=true to regenerate.',
            existing_summary_id: existingSummary.id,
            generated_at: existingSummary.generated_at,
          },
        },
        { status: 409 }
      )
    }

    // Generate the recap from notes
    try {
      const { summaryId, summary, actionItemIds } = await generateAndSaveSummaryFromNotes(
        focusId,
        menteeNotes,
        mentorNotes,
        createActionItems
      )

      // Get session info for HTML generation
      const goal = Array.isArray(collaboration.goal) ? collaboration.goal[0] : collaboration.goal
      const mentor = Array.isArray(collaboration.mentor_profile) ? collaboration.mentor_profile[0] : collaboration.mentor_profile
      const mentee = Array.isArray(collaboration.mentee_profile) ? collaboration.mentee_profile[0] : collaboration.mentee_profile

      const sessionInfo = {
        date: new Date(focus.scheduled_at).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        menteeName: mentee?.display_name || 'Mentee',
        mentorName: mentor?.display_name || 'Mentor',
        goalTitle: goal?.title || 'Untitled Goal',
      }

      // Return HTML if requested
      if (format === 'html') {
        const html = generateHtmlRecap(summary, sessionInfo)
        return new NextResponse(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        })
      }

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
          source: 'notes',
        },
        message: existingSummary ? 'Recap regenerated successfully' : 'Recap generated successfully',
      })
    } catch (genError) {
      console.error('Error generating recap:', genError)

      if (genError instanceof Error) {
        if (genError.message.includes('At least one party must provide notes')) {
          return NextResponse.json(
            {
              error: {
                code: 'NO_NOTES',
                message: 'No notes available. Please provide mentee_notes or mentor_notes in the request body, or add notes to the focus agenda.',
              },
            },
            { status: 400 }
          )
        }
        if (genError.message.includes('rate limit')) {
          return NextResponse.json(
            {
              error: { code: 'RATE_LIMITED', message: 'AI service is rate limited. Please try again later.' },
            },
            { status: 429 }
          )
        }
        if (genError.message.includes('timeout')) {
          return NextResponse.json(
            {
              error: { code: 'TIMEOUT', message: 'Recap generation timed out. Please try again.' },
            },
            { status: 504 }
          )
        }
        if (genError.message.includes('API key')) {
          return NextResponse.json(
            {
              error: { code: 'CONFIG_ERROR', message: 'AI service is not configured correctly.' },
            },
            { status: 500 }
          )
        }
      }

      return NextResponse.json(
        {
          error: {
            code: 'GENERATION_FAILED',
            message: genError instanceof Error ? genError.message : 'Failed to generate recap',
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

    console.error('Error in POST /api/focuses/[id]/recap:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate recap' } },
      { status: 500 }
    )
  }
}
