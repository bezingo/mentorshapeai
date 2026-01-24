import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import {
  expandAvailabilityToDateRange,
  subtractBusyBlocks,
  isValidTimezone,
  utcToTime,
} from '@/lib/utils/timezone'

/**
 * Query params schema for public availability endpoint
 */
const AvailabilityQuerySchema = z.object({
  timezone: z.string().optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from_date must be in YYYY-MM-DD format').optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to_date must be in YYYY-MM-DD format').optional(),
  days: z.coerce.number().int().min(1).max(30).default(14),
})

/**
 * GET /api/public/mentor/[handle]/availability
 * Fetch public availability slots for booking UI, converted to requester's timezone
 * 
 * This is a PUBLIC endpoint - no authentication required
 * Returns expanded availability slots for the next N days (default 14)
 * 
 * Query params:
 * - timezone: Target timezone for returned times (optional, returns in mentor's TZ if not provided)
 * - from_date: Start of date range (YYYY-MM-DD, defaults to today)
 * - to_date: End of date range (YYYY-MM-DD, defaults to from_date + days)
 * - days: Number of days to fetch (default 14, max 30, ignored if to_date provided)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params

    if (!handle || handle.trim() === '') {
      return NextResponse.json(
        { error: { code: 'HANDLE_REQUIRED', message: 'Mentor handle is required' } },
        { status: 400 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      timezone: searchParams.get('timezone'),
      from_date: searchParams.get('from_date'),
      to_date: searchParams.get('to_date'),
      days: searchParams.get('days') ?? 14,
    }

    const parseResult = AvailabilityQuerySchema.safeParse(queryParams)
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

    const { timezone: targetTimezone, from_date, to_date, days } = parseResult.data

    // Validate target timezone if provided
    if (targetTimezone && !isValidTimezone(targetTimezone)) {
      return NextResponse.json(
        { error: { code: 'INVALID_TIMEZONE', message: `Invalid timezone: ${targetTimezone}` } },
        { status: 400 }
      )
    }

    // Calculate date range
    const now = new Date()
    const fromDate = from_date 
      ? new Date(from_date + 'T00:00:00Z')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    let toDate: Date
    if (to_date) {
      toDate = new Date(to_date + 'T23:59:59Z')
    } else {
      toDate = new Date(fromDate)
      toDate.setDate(toDate.getDate() + days - 1)
      toDate.setHours(23, 59, 59, 999)
    }

    // Validate date range
    if (fromDate > toDate) {
      return NextResponse.json(
        { error: { code: 'INVALID_DATE_RANGE', message: 'from_date must be before or equal to to_date' } },
        { status: 400 }
      )
    }

    // Limit date range to 30 days
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 30) {
      return NextResponse.json(
        { error: { code: 'DATE_RANGE_TOO_LARGE', message: 'Date range cannot exceed 30 days' } },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceClient()

    // Find the mentor profile by handle
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('id, is_mentor, public_handle, timezone, display_name')
      .eq('public_handle', handle)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: { code: 'MENTOR_NOT_FOUND', message: 'Mentor not found' } },
        { status: 404 }
      )
    }

    if (!profile.is_mentor) {
      return NextResponse.json(
        { error: { code: 'NOT_A_MENTOR', message: 'This user is not a mentor' } },
        { status: 404 }
      )
    }

    // Fetch weekly availability patterns (active only)
    const { data: availabilitySlots, error: availError } = await serviceSupabase
      .from('mentor_availability')
      .select('id, day_of_week, start_time, end_time, timezone, is_active')
      .eq('profile_id', profile.id)
      .eq('is_active', true)

    if (availError) {
      console.error('Error fetching availability:', availError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch availability' } },
        { status: 500 }
      )
    }

    // If no availability configured, return empty slots
    if (!availabilitySlots || availabilitySlots.length === 0) {
      return NextResponse.json({
        data: {
          slots: [],
          meta: {
            mentor_id: profile.id,
            mentor_handle: profile.public_handle,
            mentor_timezone: profile.timezone || 'UTC',
            from_date: fromDate.toISOString().split('T')[0],
            to_date: toDate.toISOString().split('T')[0],
            total_slots: 0,
            target_timezone: targetTimezone || null,
          },
        },
      })
    }

    // Fetch calendar busy blocks for the date range
    const { data: busyBlocks, error: busyError } = await serviceSupabase
      .from('calendar_busy_blocks')
      .select('id, start_time, end_time')
      .eq('profile_id', profile.id)
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
      day_of_week: number
      start_time: string
      end_time: string
      start_utc: Date
      end_utc: Date
      timezone: string
    }> = []

    for (const slot of availabilitySlots) {
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
          day_of_week: slot.day_of_week,
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

    // Filter out past slots (slots that have already ended)
    const futureSlots = availableSlots.filter(slot => slot.end_utc > now)

    // Sort by date and time
    futureSlots.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.start_time.localeCompare(b.start_time)
    })

    // Day names for display
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    // Format response with timezone conversion if requested
    const responseSlots = futureSlots.map(slot => {
      const base = {
        availability_id: slot.availability_id,
        date: slot.date,
        day_of_week: slot.day_of_week,
        day_name: dayNames[slot.day_of_week],
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

    // Group slots by date for easier UI consumption
    const slotsByDate: Record<string, typeof responseSlots> = {}
    for (const slot of responseSlots) {
      if (!slotsByDate[slot.date]) {
        slotsByDate[slot.date] = []
      }
      slotsByDate[slot.date].push(slot)
    }

    return NextResponse.json({
      data: {
        slots: responseSlots,
        slots_by_date: slotsByDate,
        meta: {
          mentor_id: profile.id,
          mentor_handle: profile.public_handle,
          mentor_name: profile.display_name,
          mentor_timezone: profile.timezone || 'UTC',
          from_date: fromDate.toISOString().split('T')[0],
          to_date: toDate.toISOString().split('T')[0],
          total_slots: responseSlots.length,
          busy_blocks_applied: formattedBusyBlocks.length,
          target_timezone: targetTimezone || null,
        },
      },
    })
  } catch (error) {
    console.error('Error in GET /api/public/mentor/[handle]/availability:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch availability' } },
      { status: 500 }
    )
  }
}
