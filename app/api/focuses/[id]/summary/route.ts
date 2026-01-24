import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/focuses/[id]/summary
 * Get focus summary
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

    const { id: focusId } = await params
    const supabase = createServiceClient()

    // Fetch focus to verify access
    const { data: focus, error: focusError } = await supabase
      .from('focuses')
      .select(`
        id,
        status,
        collaboration:collaborations!focuses_collaboration_id_fkey(
          id,
          mentor_profile_id,
          mentee_profile_id
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
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this focus',
          },
        },
        { status: 403 }
      )
    }

    // Fetch summary
    const { data: summary, error: summaryError } = await supabase
      .from('focus_summaries')
      .select(`
        id,
        focus_id,
        summary,
        key_decisions,
        mentee_action_items,
        mentor_action_items,
        milestone_updates,
        mood_rating,
        generated_at,
        created_at,
        updated_at
      `)
      .eq('focus_id', focusId)
      .single()

    if (summaryError) {
      if (summaryError.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Summary not found for this focus' } },
          { status: 404 }
        )
      }
      console.error('Error fetching summary:', summaryError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch summary' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        ...summary,
        focus_status: focus.status,
        user_role: isMentor ? 'mentor' : 'mentee',
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/focuses/[id]/summary:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch summary' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/focuses/[id]/summary
 * Update summary mood_rating (mentee can rate after viewing summary)
 */
export async function PATCH(
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
    const body = await request.json()
    const supabase = createServiceClient()

    // Fetch focus to verify access and determine role
    const { data: focus, error: focusError } = await supabase
      .from('focuses')
      .select(`
        id,
        collaboration:collaborations!focuses_collaboration_id_fkey(
          id,
          mentor_profile_id,
          mentee_profile_id
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
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this focus',
          },
        },
        { status: 403 }
      )
    }

    // Only mentee can update mood_rating
    if (!isMentee) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only the mentee can update the mood rating',
          },
        },
        { status: 403 }
      )
    }

    // Validate mood_rating
    const moodRating = body.mood_rating
    if (moodRating === undefined || typeof moodRating !== 'number' || moodRating < 1 || moodRating > 5) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'mood_rating must be a number between 1 and 5',
          },
        },
        { status: 400 }
      )
    }

    // Update summary
    const { data: summary, error: updateError } = await supabase
      .from('focus_summaries')
      .update({
        mood_rating: moodRating,
        updated_at: new Date().toISOString(),
      })
      .eq('focus_id', focusId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Summary not found for this focus' } },
          { status: 404 }
        )
      }
      console.error('Error updating summary:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: 'Failed to update summary' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        ...summary,
        user_role: 'mentee',
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in PATCH /api/focuses/[id]/summary:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update summary' } },
      { status: 500 }
    )
  }
}
