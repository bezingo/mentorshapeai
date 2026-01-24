import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import {
  UpdateCollaborationSchema,
  CancelCollaborationSchema,
  isValidStatusTransition,
  getStatusTimestamps,
  type CollaborationStatus,
} from '@/lib/validations/collaboration'

/**
 * GET /api/collaborations/[id]
 * Get collaboration details with mentor, mentee, and goal info
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

    // Fetch collaboration with all related data
    const { data: collaboration, error } = await supabase
      .from('collaborations')
      .select(
        `
        *,
        goal:goals!collaborations_goal_id_fkey(
          id,
          title,
          description,
          status,
          category,
          success_definition,
          current_challenges,
          motivation,
          duration_days,
          created_at
        ),
        mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle,
          bio,
          timezone
        ),
        mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle,
          bio,
          timezone
        ),
        offer:mentor_offers!collaborations_offer_id_fkey(
          id,
          title,
          type,
          description,
          duration_minutes,
          price_cents,
          currency
        ),
        cancelled_by_profile:profiles!collaborations_cancelled_by_fkey(
          id,
          display_name
        )
      `
      )
      .eq('id', id)
      .single()

    if (error || !collaboration) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching collaboration:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error?.message || 'Failed to fetch' } },
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

    return NextResponse.json({
      data: {
        ...collaboration,
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

    console.error('Error in GET /api/collaborations/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch collaboration' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/collaborations/[id]
 * Update collaboration status (accept, decline, complete, activate)
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
    const parseResult = UpdateCollaborationSchema.safeParse(body)
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

    const { status: newStatus, response_message } = parseResult.data

    const supabase = createServiceClient()

    // Fetch existing collaboration
    const { data: collaboration, error: fetchError } = await supabase
      .from('collaborations')
      .select('id, mentor_profile_id, mentee_profile_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !collaboration) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching collaboration:', fetchError)
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

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Handle status change
    if (newStatus) {
      const currentStatus = collaboration.status as CollaborationStatus
      const transitionResult = isValidStatusTransition(currentStatus, newStatus, isMentor)

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
      const timestamps = getStatusTimestamps(newStatus)
      Object.assign(updateData, timestamps)

      // For cancellation via PATCH (though DELETE is preferred)
      if (newStatus === 'cancelled') {
        updateData.cancelled_by = profile.id
      }
    }

    // Handle response message (typically used when accepting/declining)
    if (response_message !== undefined) {
      updateData.response_message = response_message
    }

    // Perform update
    const { data: updatedCollab, error: updateError } = await supabase
      .from('collaborations')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        goal:goals!collaborations_goal_id_fkey(
          id,
          title,
          description,
          status,
          category
        ),
        mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle
        ),
        mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle
        ),
        offer:mentor_offers!collaborations_offer_id_fkey(
          id,
          title,
          type,
          duration_minutes
        )
      `
      )
      .single()

    if (updateError) {
      console.error('Error updating collaboration:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        ...updatedCollab,
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

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    console.error('Error in PATCH /api/collaborations/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update collaboration' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/collaborations/[id]
 * Cancel a collaboration with an optional reason
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

    // Parse optional body for cancellation reason
    let cancellationReason: string | null = null
    try {
      const body = await request.json()
      const parseResult = CancelCollaborationSchema.safeParse(body)
      if (parseResult.success && parseResult.data.reason) {
        cancellationReason = parseResult.data.reason
      }
    } catch {
      // No body or invalid JSON - that's okay, reason is optional
    }

    // Fetch existing collaboration
    const { data: collaboration, error: fetchError } = await supabase
      .from('collaborations')
      .select('id, mentor_profile_id, mentee_profile_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !collaboration) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Collaboration not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching collaboration:', fetchError)
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

    // Check if collaboration can be cancelled
    const currentStatus = collaboration.status as CollaborationStatus
    const cancellableStatuses: CollaborationStatus[] = ['pending', 'accepted', 'active']

    if (!cancellableStatuses.includes(currentStatus)) {
      return NextResponse.json(
        {
          error: {
            code: 'CANNOT_CANCEL',
            message: `Cannot cancel a collaboration with status '${currentStatus}'`,
          },
        },
        { status: 400 }
      )
    }

    // Update to cancelled status
    const { data: cancelledCollab, error: updateError } = await supabase
      .from('collaborations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: profile.id,
        cancellation_reason: cancellationReason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        `
        *,
        goal:goals!collaborations_goal_id_fkey(
          id,
          title
        ),
        mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
          id,
          display_name
        ),
        mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
          id,
          display_name
        )
      `
      )
      .single()

    if (updateError) {
      console.error('Error cancelling collaboration:', updateError)
      return NextResponse.json(
        { error: { code: 'CANCEL_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        ...cancelledCollab,
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

    console.error('Error in DELETE /api/collaborations/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel collaboration' } },
      { status: 500 }
    )
  }
}
