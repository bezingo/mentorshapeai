import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/focuses/[id]/agenda
 * Get focus agenda
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

    // Verify user has access through the collaboration
    const collaboration = focus.collaboration as {
      mentor_profile_id: string
      mentee_profile_id: string
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

    // Fetch agenda
    const { data: agenda, error: agendaError } = await supabase
      .from('focus_agendas')
      .select(`
        id,
        focus_id,
        topics,
        questions,
        previous_action_items,
        preparation_tips,
        mentee_notes,
        mentor_notes,
        generated_at,
        created_at,
        updated_at
      `)
      .eq('focus_id', focusId)
      .single()

    if (agendaError) {
      if (agendaError.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Agenda not found for this focus' } },
          { status: 404 }
        )
      }
      console.error('Error fetching agenda:', agendaError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch agenda' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        ...agenda,
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

    console.error('Error in GET /api/focuses/[id]/agenda:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch agenda' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/focuses/[id]/agenda
 * Update agenda notes (mentee_notes or mentor_notes)
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

    const collaboration = focus.collaboration as {
      mentor_profile_id: string
      mentee_profile_id: string
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

    // Prepare update data - only allow updating the appropriate notes field
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (isMentee && body.mentee_notes !== undefined) {
      updateData.mentee_notes = body.mentee_notes
    }

    if (isMentor && body.mentor_notes !== undefined) {
      updateData.mentor_notes = body.mentor_notes
    }

    // Check if we have anything to update
    if (Object.keys(updateData).length === 1) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid fields to update',
          },
        },
        { status: 400 }
      )
    }

    // Update agenda
    const { data: agenda, error: updateError } = await supabase
      .from('focus_agendas')
      .update(updateData)
      .eq('focus_id', focusId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Agenda not found for this focus' } },
          { status: 404 }
        )
      }
      console.error('Error updating agenda:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: 'Failed to update agenda' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        ...agenda,
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

    console.error('Error in PATCH /api/focuses/[id]/agenda:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update agenda' } },
      { status: 500 }
    )
  }
}
