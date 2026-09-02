import { NextResponse, NextRequest } from 'next/server'
import { ensureUserAndProfile, requireAuth } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import {
  expandAvailabilityToDateRange,
  subtractBusyBlocks,
  isValidTimezone,
  utcToTime,
} from '@/lib/utils/timezone'

/**
 * Query params schema for slots endpoint
 */
const SlotsQuerySchema = z.object({
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from_date must be in YYYY-MM-DD format'),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to_date must be in YYYY-MM-DD format'),
  timezone: z.string().optional(), // Target timezone for returned times
  profile_id: z.string().uuid().optional(), // For fetching another mentor's availability (public)
})

/**
 * GET /api/mentor/availability/slots
 * Calculate available booking slots for a date range
 * 
 * This endpoint:
 * 1. Takes weekly availability patterns
 * 2. Expands them to specific dates within the requested range
 * 3. Subtracts calendar busy blocks
 * 4. Returns bookable time slots
 * 
 * Query params:
 * - from_date: Start of date range (YYYY-MM-DD)
 * - to_date: End of date range (YYYY-MM-DD)
 * - timezone: (optional) Target timezone for returned times
 * - profile_id: (optional) Fetch availability for a specific mentor (for public viewing)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      from_date: searchParams.get('from_date'),
      to_date: searchParams.get('to_date'),
      timezone: searchParams.get('timezone'),
      profile_id: searchParams.get('profile_id'),
    }

    // Validate query params
    const parseResult = SlotsQuerySchema.safeParse(queryParams)
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

    const { from_date, to_date, timezone: targetTimezone, profile_id: requestedProfileId } = parseResult.data

    // Parse dates
    const fromDate = new Date(from_date + 'T00:00:00Z')
    const toDate = new Date(to_date + 'T23:59:59Z')

    // Validate date range
    if (fromDate > toDate) {
      return NextResponse.json(
        { error: { code: 'INVALID_DATE_RANGE', message: 'from_date must be before or equal to to_date' } },
        { status: 400 }
      )
    }

    // Limit date range to 30 days to prevent abuse
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 30) {
      return NextResponse.json(
        { error: { code: 'DATE_RANGE_TOO_LARGE', message: 'Date range cannot exceed 30 days' } },
        { status: 400 }
      )
    }

    // Validate target timezone if provided
    if (targetTimezone && !isValidTimezone(targetTimezone)) {
      return NextResponse.json(
        { error: { code: 'INVALID_TIMEZONE', message: `Invalid timezone: ${targetTimezone}` } },
        { status: 400 }
      )
    }

    let profileId: string

    // Determine whose availability to fetch
    if (requestedProfileId) {
      // Fetching public availability for another mentor
      // Verify the profile exists and is a mentor with a public handle
      const serviceSupabase = createServiceClient()
      const { data: mentorProfile, error: mentorError } = await serviceSupabase
        .from('profiles')
        .select('id, is_mentor, public_handle')
        .eq('id', requestedProfileId)
        .single()

      if (mentorError || !mentorProfile) {
        return NextResponse.json(
          { error: { code: 'MENTOR_NOT_FOUND', message: 'Mentor not found' } },
          { status: 404 }
        )
      }

      if (!mentorProfile.is_mentor || !mentorProfile.public_handle) {
        return NextResponse.json(
          { error: { code: 'NOT_A_MENTOR', message: 'This user is not a public mentor' } },
          { status: 404 }
        )
      }

      profileId = requestedProfileId
    } else {
      // Fetching own availability - requires authentication
      await requireAuth()
      const profile = await ensureUserAndProfile()

      if (!profile || !profile.id) {
        return NextResponse.json(
          { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
          { status: 404 }
        )
      }

      profileId = profile.id
    }

    const serviceSupabase = createServiceClient()

    // Fetch weekly availability patterns
    const { data: availabilitySlots, error: availError } = await serviceSupabase
      .from('mentor_availability')
      .select('id, day_of_week, start_time, end_time, timezone, is_active')
      .eq('profile_id', profileId)
      .eq('is_active', true)

    if (availError) {
      console.error('Error fetching availability:', availError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch availability' } },
        { status: 500 }
      )
    }

    // Fetch calendar busy blocks for the date range
    const { data: busyBlocks, error: busyError } = await serviceSupabase
      .from('calendar_busy_blocks')
      .select('id, start_time, end_time')
      .eq('profile_id', profileId)
      .gte('end_time', fromDate.toISOString())
      .lte('start_time', toDate.toISOString())

    if (busyError) {
      console.error('Error fetching busy blocks:', busyError)
      // Non-fatal - continue without busy blocks
    }

    // Expand weekly patterns to specific dates
    const expandedSlots: Array<{
      availability_id: string
      date: string
      start_time: string
      end_time: string
      start_utc: Date
      end_utc: Date
      timezone: string
    }> = []

    for (const slot of availabilitySlots || []) {
      const expanded = expandAvailabilityToDateRange(
        slot.day_of_week,
        slot.start_time,
        slot.end_time,
        slot.timezone,
        fromDate,
        toDate
      )

      for (const expandedSlot of expanded) {
        expandedSlots.push({
          availability_id: slot.id,
          ...expandedSlot,
          timezone: slot.timezone,
        })
      }
    }

    // Convert busy blocks to proper format
    const formattedBusyBlocks = (busyBlocks || []).map(block => ({
      start_time: new Date(block.start_time),
      end_time: new Date(block.end_time),
    }))

    // Subtract busy blocks from expanded slots
    const availableSlots = subtractBusyBlocks(expandedSlots, formattedBusyBlocks)

    // Sort by date and time
    availableSlots.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.start_time.localeCompare(b.start_time)
    })

    // Format response, optionally converting to target timezone
    const responseSlots = availableSlots.map(slot => {
      const base = {
        availability_id: slot.availability_id,
        date: slot.date,
        start_time_utc: slot.start_utc.toISOString(),
        end_time_utc: slot.end_utc.toISOString(),
        original_timezone: slot.timezone,
        start_time_original: slot.start_time,
        end_time_original: slot.end_time,
      }

      // If target timezone provided, include converted times
      if (targetTimezone) {
        return {
          ...base,
          target_timezone: targetTimezone,
          start_time_local: utcToTime(slot.start_utc, targetTimezone),
          end_time_local: utcToTime(slot.end_utc, targetTimezone),
        }
      }

      return base
    })

    return NextResponse.json({
      data: {
        slots: responseSlots,
        meta: {
          from_date,
          to_date,
          total_slots: responseSlots.length,
          busy_blocks_count: formattedBusyBlocks.length,
          target_timezone: targetTimezone || null,
        },
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/mentor/availability/slots:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to calculate available slots' } },
      { status: 500 }
    )
  }
}
