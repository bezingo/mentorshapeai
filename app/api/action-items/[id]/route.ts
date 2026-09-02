import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import {
  UpdateActionItemSchema,
  isValidActionItemStatusTransition,
  getActionItemStatusTimestamps,
  type ActionItemStatus,
} from '@/lib/validations/action-items'

/**
 * GET /api/action-items/[id]
 * Get a single action item
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

    const { id } = await params
    const supabase = createServiceClient()

    // Fetch action item with related data
    const { data: actionItem, error } = await supabase
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
        ),
        collaboration:collaborations!action_items_collaboration_id_fkey(
          id,
          mentor_profile_id,
          mentee_profile_id,
          status
        )
      `
      )
      .eq('id', id)
      .single()

    if (error || !actionItem) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Action item not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching action item:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error?.message || 'Failed to fetch' } },
        { status: 500 }
      )
    }

    // Verify user has access (must be mentor or mentee of the collaboration)
    const collaboration = Array.isArray(actionItem.collaboration)
      ? actionItem.collaboration[0]
      : actionItem.collaboration

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
            message: 'You do not have access to this action item',
          },
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      data: {
        ...actionItem,
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

    console.error('Error in GET /api/action-items/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch action item' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/action-items/[id]
 * Update an action item (title, description, due_date, status)
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

    const { id } = await params
    const body = await request.json()

    // Validate input
    const parseResult = UpdateActionItemSchema.safeParse(body)
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

    const { title, description, due_date, status: newStatus } = parseResult.data

    const supabase = createServiceClient()

    // Fetch existing action item with collaboration
    const { data: actionItem, error: fetchError } = await supabase
      .from('action_items')
      .select(
        `
        id,
        status,
        collaboration_id,
        collaboration:collaborations!action_items_collaboration_id_fkey(
          mentor_profile_id,
          mentee_profile_id
        )
      `
      )
      .eq('id', id)
      .single()

    if (fetchError || !actionItem) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Action item not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching action item:', fetchError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch action item' } },
        { status: 500 }
      )
    }

    // Verify user has access
    const collaboration = Array.isArray(actionItem.collaboration)
      ? actionItem.collaboration[0]
      : actionItem.collaboration

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
            message: 'You do not have access to this action item',
          },
        },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Handle status change
    if (newStatus) {
      const currentStatus = actionItem.status as ActionItemStatus
      const transitionResult = isValidActionItemStatusTransition(currentStatus, newStatus)

      if (!transitionResult.valid) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_STATUS_TRANSITION',
              message: transitionResult.error,
            },
          },
          { status: 400 }
        )
      }

      updateData.status = newStatus

      // Add relevant timestamps
      const timestamps = getActionItemStatusTimestamps(newStatus)
      Object.assign(updateData, timestamps)
    }

    // Handle other field updates
    if (title !== undefined) {
      updateData.title = title
    }
    if (description !== undefined) {
      updateData.description = description
    }
    if (due_date !== undefined) {
      updateData.due_date = due_date
    }

    // Perform update
    const { data: updatedItem, error: updateError } = await supabase
      .from('action_items')
      .update(updateData)
      .eq('id', id)
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

    if (updateError) {
      console.error('Error updating action item:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        ...updatedItem,
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

    console.error('Error in PATCH /api/action-items/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update action item' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/action-items/[id]
 * Delete an action item
 */
export async function DELETE(
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

    const { id } = await params
    const supabase = createServiceClient()

    // Fetch existing action item to verify access
    const { data: actionItem, error: fetchError } = await supabase
      .from('action_items')
      .select(
        `
        id,
        collaboration:collaborations!action_items_collaboration_id_fkey(
          mentor_profile_id,
          mentee_profile_id
        )
      `
      )
      .eq('id', id)
      .single()

    if (fetchError || !actionItem) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Action item not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching action item:', fetchError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch action item' } },
        { status: 500 }
      )
    }

    // Verify user has access
    const collaboration = Array.isArray(actionItem.collaboration)
      ? actionItem.collaboration[0]
      : actionItem.collaboration

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
            message: 'You do not have access to this action item',
          },
        },
        { status: 403 }
      )
    }

    // Delete the action item
    const { error: deleteError } = await supabase
      .from('action_items')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting action item:', deleteError)
      return NextResponse.json(
        { error: { code: 'DELETE_FAILED', message: deleteError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: { id, deleted: true },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in DELETE /api/action-items/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete action item' } },
      { status: 500 }
    )
  }
}
