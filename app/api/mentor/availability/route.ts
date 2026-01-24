import { NextResponse, NextRequest } from 'next/server'
import { ensureUserAndProfile, requireAuth } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import {
  checkSlotOverlap,
  countSlotsOnDay,
  MAX_SLOTS_PER_DAY,
  validateSlot,
  getDayName,
} from '@/lib/utils/availability'
import { isValidTimezone, getDetectedTimezone } from '@/lib/utils/timezone'

/**
 * Schema for creating a new availability slot
 */
const CreateAvailabilitySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  timezone: z.string().optional(),
  is_active: z.boolean().optional().default(true),
})

/**
 * GET /api/mentor/availability
 * Fetch all weekly availability slots for the authenticated user
 */
export async function GET() {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const serviceSupabase = createServiceClient()

    // Fetch all availability slots for this profile
    const { data: slots, error } = await serviceSupabase
      .from('mentor_availability')
      .select('id, day_of_week, start_time, end_time, timezone, is_active, created_at, updated_at')
      .eq('profile_id', profile.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching availability:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch availability slots' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: slots })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/mentor/availability:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch availability' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/mentor/availability
 * Create a new availability slot with overlap validation
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const parseResult = CreateAvailabilitySchema.safeParse(body)
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

    const { day_of_week, start_time, end_time, timezone, is_active } = parseResult.data

    // Determine timezone - use provided, or try to detect, or default to UTC
    const effectiveTimezone = timezone || getDetectedTimezone()
    
    // Validate timezone
    if (!isValidTimezone(effectiveTimezone)) {
      return NextResponse.json(
        { error: { code: 'INVALID_TIMEZONE', message: `Invalid timezone: ${effectiveTimezone}` } },
        { status: 400 }
      )
    }

    // Validate time range
    const validation = validateSlot({ day_of_week, start_time, end_time })
    if (!validation.isValid) {
      return NextResponse.json(
        { error: { code: 'AVAILABILITY_INVALID_RANGE', message: validation.error } },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceClient()

    // Fetch existing slots to check for overlaps and slot limit
    const { data: existingSlots, error: fetchError } = await serviceSupabase
      .from('mentor_availability')
      .select('id, day_of_week, start_time, end_time, is_active')
      .eq('profile_id', profile.id)

    if (fetchError) {
      console.error('Error fetching existing slots:', fetchError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to check existing slots' } },
        { status: 500 }
      )
    }

    // Check slot limit per day
    const slotsOnDay = countSlotsOnDay(existingSlots || [], day_of_week)
    if (slotsOnDay >= MAX_SLOTS_PER_DAY) {
      return NextResponse.json(
        {
          error: {
            code: 'MAX_SLOTS_EXCEEDED',
            message: `Maximum ${MAX_SLOTS_PER_DAY} slots allowed per day. ${getDayName(day_of_week)} already has ${slotsOnDay} slots.`,
          },
        },
        { status: 400 }
      )
    }

    // Check for overlaps
    const overlapCheck = checkSlotOverlap(
      { day_of_week, start_time, end_time },
      existingSlots || []
    )

    if (overlapCheck.isOverlapping) {
      return NextResponse.json(
        {
          error: {
            code: 'AVAILABILITY_OVERLAP',
            message: `Time slot overlaps with existing slot on ${getDayName(day_of_week)} (${overlapCheck.overlappingSlot?.start_time}-${overlapCheck.overlappingSlot?.end_time})`,
            overlapping_slot: overlapCheck.overlappingSlot,
          },
        },
        { status: 400 }
      )
    }

    // Create the slot
    const { data: newSlot, error: createError } = await serviceSupabase
      .from('mentor_availability')
      .insert({
        profile_id: profile.id,
        day_of_week,
        start_time,
        end_time,
        timezone: effectiveTimezone,
        is_active,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating availability slot:', createError)
      
      // Handle constraint violation
      if (createError.code === '23514') {
        return NextResponse.json(
          { error: { code: 'AVAILABILITY_INVALID_RANGE', message: 'End time must be after start time' } },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: createError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: newSlot }, { status: 201 })
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

    console.error('Error in POST /api/mentor/availability:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create availability slot' } },
      { status: 500 }
    )
  }
}
