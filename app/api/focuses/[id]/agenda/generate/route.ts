import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { generateAndSaveFocusAgenda } from '@/lib/ai/focus-planner'

/**
 * POST /api/focuses/[id]/agenda/generate
 * Generate AI agenda for focus
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

    // Verify focus is not completed or cancelled
    if (focus.status === 'completed' || focus.status === 'cancelled') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot generate agenda for a ${focus.status} focus`,
          },
        },
        { status: 400 }
      )
    }

    // Verify user has access through the collaboration
    const collaboration = Array.isArray(focus.collaboration)
      ? focus.collaboration[0]
      : focus.collaboration

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

    // Verify collaboration is active
    if (collaboration.status !== 'active') {
      return NextResponse.json(
        {
          error: {
            code: 'COLLABORATION_NOT_ACTIVE',
            message: 'Cannot generate agenda for a focus in an inactive collaboration',
          },
        },
        { status: 400 }
      )
    }

    // Check if an agenda already exists
    const { data: existingAgenda } = await supabase
      .from('focus_agendas')
      .select('id, generated_at')
      .eq('focus_id', focusId)
      .single()

    // Parse request body for options
    let regenerate = false
    try {
      const body = await request.json()
      regenerate = body.regenerate === true
    } catch {
      // No body or invalid JSON - that's fine, use defaults
    }

    // If agenda exists and regenerate is not requested, return existing
    if (existingAgenda && !regenerate) {
      return NextResponse.json(
        {
          error: {
            code: 'AGENDA_EXISTS',
            message: 'Agenda already exists. Use regenerate=true to regenerate.',
            existing_agenda_id: existingAgenda.id,
            generated_at: existingAgenda.generated_at,
          },
        },
        { status: 409 }
      )
    }

    // Generate the agenda
    try {
      const { agendaId, agenda } = await generateAndSaveFocusAgenda(focusId)

      return NextResponse.json({
        data: {
          id: agendaId,
          focus_id: focusId,
          topics: agenda.topics,
          questions: agenda.questions,
          previous_action_items: agenda.previous_action_items,
          preparation_tips: agenda.preparation_tips,
          generated_at: new Date().toISOString(),
          user_role: isMentor ? 'mentor' : 'mentee',
        },
        message: existingAgenda ? 'Agenda regenerated successfully' : 'Agenda generated successfully',
      })
    } catch (genError) {
      console.error('Error generating agenda:', genError)
      
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
                message: 'Agenda generation timed out. Please try again.',
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
      }

      return NextResponse.json(
        {
          error: {
            code: 'GENERATION_FAILED',
            message: genError instanceof Error ? genError.message : 'Failed to generate agenda',
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

    console.error('Error in POST /api/focuses/[id]/agenda/generate:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate agenda' } },
      { status: 500 }
    )
  }
}
