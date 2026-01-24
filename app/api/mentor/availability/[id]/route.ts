import { NextResponse, NextRequest } from 'next/server'
import { ensureUserAndProfile, requireAuth } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import {
  checkSlotOverlap,
  validateSlot,
  getDayName,
} from '@/lib/utils/availability'
import { isValidTimezone } from '@/lib/utils/timezone'

/**
 * Schema for updating an availability slot
 */
const UpdateAvailabilitySchema = z.object({
  day_of_week: z.number().int().min(0).max(6).optional(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)').optional(),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)').optional(),
  timezone: z.string().optional(),
  is_active: z.boolean().optional(),
})

/**
 * PUT /api/mentor/availability/[id]
 * Update an existing availability slot
 */
export async function PUT(
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
    const parseResult = UpdateAvailabilitySchema.safeParse(body)
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

    const updateData = parseResult.data

    // Validate timezone if provided
    if (updateData.timezone && !isValidTimezone(updateData.timezone)) {
      return NextResponse.json(
        { error: { code: 'INVALID_TIMEZONE', message: `Invalid timezone: ${updateData.timezone}` } },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceClient()

    // Fetch the existing slot to verify ownership
    const { data: existingSlot, error: fetchError } = await serviceSupabase
      .from('mentor_availability')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingSlot) {
      return NextResponse.json(
        { error: { code: 'SLOT_NOT_FOUND', message: 'Availability slot not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    if (existingSlot.profile_id !== profile.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to update this slot' } },
        { status: 403 }
      )
    }

    // Merge with existing data for validation
    const mergedSlot = {
      day_of_week: updateData.day_of_week ?? existingSlot.day_of_week,
      start_time: updateData.start_time ?? existingSlot.start_time,
      end_time: updateData.end_time ?? existingSlot.end_time,
    }

    // Validate merged time range
    const validation = validateSlot(mergedSlot)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: { code: 'AVAILABILITY_INVALID_RANGE', message: validation.error } },
        { status: 400 }
      )
    }

    // Check for overlaps with other slots (only if times or day changed)
    if (
      updateData.day_of_week !== undefined ||
      updateData.start_time !== undefined ||
      updateData.end_time !== undefined
    ) {
      // Fetch all other slots for overlap checking
      const { data: allSlots, error: slotsError } = await serviceSupabase
        .from('mentor_availability')
        .select('id, day_of_week, start_time, end_time, is_active')
        .eq('profile_id', profile.id)

      if (slotsError) {
        console.error('Error fetching slots for overlap check:', slotsError)
        return NextResponse.json(
          { error: { code: 'FETCH_FAILED', message: 'Failed to check for overlaps' } },
          { status: 500 }
        )
      }

      const overlapCheck = checkSlotOverlap(
        mergedSlot,
        allSlots || [],
        id // Exclude current slot from comparison
      )

      if (overlapCheck.isOverlapping) {
        return NextResponse.json(
          {
            error: {
              code: 'AVAILABILITY_OVERLAP',
              message: `Time slot overlaps with existing slot on ${getDayName(mergedSlot.day_of_week)} (${overlapCheck.overlappingSlot?.start_time}-${overlapCheck.overlappingSlot?.end_time})`,
              overlapping_slot: overlapCheck.overlappingSlot,
            },
          },
          { status: 400 }
        )
      }
    }

    // Prepare update object (only include fields that were provided)
    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() }
    
    if (updateData.day_of_week !== undefined) updateFields.day_of_week = updateData.day_of_week
    if (updateData.start_time !== undefined) updateFields.start_time = updateData.start_time
    if (updateData.end_time !== undefined) updateFields.end_time = updateData.end_time
    if (updateData.timezone !== undefined) updateFields.timezone = updateData.timezone
    if (updateData.is_active !== undefined) updateFields.is_active = updateData.is_active

    // Update the slot
    const { data: updatedSlot, error: updateError } = await serviceSupabase
      .from('mentor_availability')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating availability slot:', updateError)
      
      // Handle constraint violation
      if (updateError.code === '23514') {
        return NextResponse.json(
          { error: { code: 'AVAILABILITY_INVALID_RANGE', message: 'End time must be after start time' } },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: updatedSlot })
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

    console.error('Error in PUT /api/mentor/availability/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update availability slot' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/mentor/availability/[id]
 * Delete an availability slot
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
    const serviceSupabase = createServiceClient()

    // Fetch the slot to verify ownership
    const { data: existingSlot, error: fetchError } = await serviceSupabase
      .from('mentor_availability')
      .select('id, profile_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingSlot) {
      return NextResponse.json(
        { error: { code: 'SLOT_NOT_FOUND', message: 'Availability slot not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    if (existingSlot.profile_id !== profile.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to delete this slot' } },
        { status: 403 }
      )
    }

    // Delete the slot
    const { error: deleteError } = await serviceSupabase
      .from('mentor_availability')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting availability slot:', deleteError)
      return NextResponse.json(
        { error: { code: 'DELETE_FAILED', message: deleteError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { success: true, deleted_id: id } })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in DELETE /api/mentor/availability/[id]:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete availability slot' } },
      { status: 500 }
    )
  }
}
