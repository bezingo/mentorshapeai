import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import {
  CreateCheckInSchema,
  ListCheckInsQuerySchema,
  isValidWeekStart,
  isWeekStartNotInFuture,
} from '@/lib/validations/check-ins'

/**
 * GET /api/collaborations/[id]/check-ins
 * List check-ins for a collaboration
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
      profile_id: searchParams.get('profile_id') ?? undefined,
      from_week: searchParams.get('from_week') ?? undefined,
      to_week: searchParams.get('to_week') ?? undefined,
      limit: searchParams.get('limit') ?? '50',
      offset: searchParams.get('offset') ?? '0',
    }

    const parseResult = ListCheckInsQuerySchema.safeParse(queryParams)
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

    const { profile_id, from_week, to_week, limit = 50, offset = 0 } = parseResult.data

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

    // Build check-ins query
    let query = supabase
      .from('check_ins')
      .select(
        `
        *,
        profile:profiles!check_ins_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle
        )
      `
      )
      .eq('collaboration_id', collaborationId)
      .order('week_start', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply profile filter
    if (profile_id) {
      query = query.eq('profile_id', profile_id)
    }

    // Apply week filters
    if (from_week) {
      query = query.gte('week_start', from_week)
    }
    if (to_week) {
      query = query.lte('week_start', to_week)
    }

    const { data: checkIns, error: checkInsError } = await query

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch check-ins' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        check_ins: checkIns || [],
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

    console.error('Error in GET /api/collaborations/[id]/check-ins:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch check-ins' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/collaborations/[id]/check-ins
 * Create a new check-in for a collaboration (user creates their own check-in)
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
    const parseResult = CreateCheckInSchema.safeParse(body)
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

    const { week_start, mood_rating, progress_notes, blockers, wins } = parseResult.data

    // Validate week_start is a Monday
    const weekStartValidation = isValidWeekStart(week_start)
    if (!weekStartValidation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_WEEK_START',
            message: weekStartValidation.error,
          },
        },
        { status: 400 }
      )
    }

    // Validate week_start is not in the future
    const futureValidation = isWeekStartNotInFuture(week_start)
    if (!futureValidation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'FUTURE_WEEK',
            message: futureValidation.error,
          },
        },
        { status: 400 }
      )
    }

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

    // Check if a check-in already exists for this user/week combination
    const { data: existingCheckIn } = await supabase
      .from('check_ins')
      .select('id')
      .eq('collaboration_id', collaborationId)
      .eq('profile_id', profile.id)
      .eq('week_start', week_start)
      .single()

    if (existingCheckIn) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_CHECK_IN',
            message: 'A check-in already exists for this week. Use PATCH to update it.',
            existing_id: existingCheckIn.id,
          },
        },
        { status: 409 }
      )
    }

    // Create the check-in
    const { data: newCheckIn, error: createError } = await supabase
      .from('check_ins')
      .insert({
        collaboration_id: collaborationId,
        profile_id: profile.id,
        week_start,
        mood_rating,
        progress_notes: progress_notes || null,
        blockers: blockers || null,
        wins: wins || null,
      })
      .select(
        `
        *,
        profile:profiles!check_ins_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle
        )
      `
      )
      .single()

    if (createError) {
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          {
            error: {
              code: 'DUPLICATE_CHECK_IN',
              message: 'A check-in already exists for this week',
            },
          },
          { status: 409 }
        )
      }
      console.error('Error creating check-in:', createError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: createError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          ...newCheckIn,
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

    console.error('Error in POST /api/collaborations/[id]/check-ins:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create check-in' } },
      { status: 500 }
    )
  }
}
