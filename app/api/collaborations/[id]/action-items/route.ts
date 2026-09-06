import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import {
  CreateActionItemSchema,
  ListActionItemsQuerySchema,
} from '@/lib/validations/action-items'

/**
 * GET /api/collaborations/[id]/action-items
 * List action items for a collaboration
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
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const queryParams = {
      status: searchParams.get('status') ?? undefined,
      assignee_profile_id: searchParams.get('assignee_profile_id') ?? undefined,
      limit: searchParams.get('limit') ?? '50',
      offset: searchParams.get('offset') ?? '0',
    }

    const parseResult = ListActionItemsQuerySchema.safeParse(queryParams)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0].message,
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const { status, assignee_profile_id, limit = 50, offset = 0 } = parseResult.data

    const supabase = createServiceClient()

    // First, verify the collaboration exists and user has access
    const { data: collaboration, error: collabError } = await supabase
      .from('collaborations')
      .select('id, mentor_profile_id, mentee_profile_id, status')
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
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch collaboration' } },
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

    // Build action items query
    let query = supabase
      .from('action_items')
      .select(
        `
        *,
        assignee:profiles!action_items_assignee_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle
        ),
        focus:focuses!action_items_focus_id_fkey(
          id,
          scheduled_at,
          status
        )
      `
      )
      .eq('collaboration_id', collaborationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply assignee filter
    if (assignee_profile_id) {
      query = query.eq('assignee_profile_id', assignee_profile_id)
    }

    const { data: actionItems, error: itemsError } = await query

    if (itemsError) {
      console.error('Error fetching action items:', itemsError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch action items' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        action_items: actionItems || [],
        collaboration_id: collaborationId,
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

    console.error('Error in GET /api/collaborations/[id]/action-items:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch action items' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/collaborations/[id]/action-items
 * Create a new action item for a collaboration
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
    const body = await request.json()

    // Validate input
    const parseResult = CreateActionItemSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0].message,
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const { title, description, due_date, assignee_profile_id, focus_id } = parseResult.data

    const supabase = createServiceClient()

    // Verify the collaboration exists and user has access
    const { data: collaboration, error: collabError } = await supabase
      .from('collaborations')
      .select('id, mentor_profile_id, mentee_profile_id, status')
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
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch collaboration' } },
        { status: 500 }
      )
    }

    // Verify user has access
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

    // Verify assignee is part of the collaboration
    const validAssignees = [collaboration.mentor_profile_id, collaboration.mentee_profile_id]
    if (!validAssignees.includes(assignee_profile_id)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_ASSIGNEE',
            message: 'Assignee must be a participant in the collaboration',
          },
        },
        { status: 400 }
      )
    }

    // If focus_id is provided, verify it belongs to this collaboration
    if (focus_id) {
      const { data: focus, error: focusError } = await supabase
        .from('focuses')
        .select('id, collaboration_id')
        .eq('id', focus_id)
        .single()

      if (focusError || !focus) {
        return NextResponse.json(
          { error: { code: 'INVALID_FOCUS', message: 'Focus not found' } },
          { status: 400 }
        )
      }

      if (focus.collaboration_id !== collaborationId) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_FOCUS',
              message: 'Focus does not belong to this collaboration',
            },
          },
          { status: 400 }
        )
      }
    }

    // Create the action item
    const { data: newItem, error: createError } = await supabase
      .from('action_items')
      .insert({
        collaboration_id: collaborationId,
        title,
        description: description || null,
        due_date: due_date || null,
        assignee_profile_id,
        focus_id: focus_id || null,
        status: 'pending',
      })
      .select(
        `
        *,
        assignee:profiles!action_items_assignee_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle
        ),
        focus:focuses!action_items_focus_id_fkey(
          id,
          scheduled_at,
          status
        )
      `
      )
      .single()

    if (createError) {
      console.error('Error creating action item:', createError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: createError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          ...newItem,
          user_role: isMentor ? 'mentor' : 'mentee',
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/collaborations/[id]/action-items:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create action item' } },
      { status: 500 }
    )
  }
}
