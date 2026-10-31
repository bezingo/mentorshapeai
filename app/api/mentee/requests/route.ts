import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSession, ensureUserAndProfile } from '@/lib/auth-helpers'
import { z } from 'zod'

const CreateRequestSchema = z.object({
  cycle_id: z.string().uuid(),
  mentor_profile_id: z.string().uuid(),
  request_message: z.string().max(1000).optional(),
  goal_category: z.enum(['finance', 'career', 'personal_growth', 'entrepreneurship']).optional(),
  priority: z.number().int().min(1).max(10).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const supabase = createServiceClient()

    const { searchParams } = new URL(request.url)
    const cycleId = searchParams.get('cycle_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('mentee_requests')
      .select(`
        *,
        cycle:program_cycles!inner(
          id, name, name_ar, status, request_deadline,
          program:programs!inner(id, name, org_id)
        ),
        mentor:profiles!mentee_requests_mentor_profile_id_fkey(
          id, display_name, avatar_url, headline, expertise_areas
        )
      `)
      .eq('mentee_profile_id', profile.id)
      .order('created_at', { ascending: false })

    if (cycleId) {
      query = query.eq('cycle_id', cycleId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Error fetching requests:', error)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    return NextResponse.json({ data: requests })
  } catch (error) {
    console.error('Error in GET /api/mentee/requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = CreateRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.errors
      }, { status: 400 })
    }

    const { cycle_id, mentor_profile_id, request_message, goal_category, priority } = parsed.data

    const supabase = createServiceClient()

    const { data: cycle, error: cycleError } = await supabase
      .from('program_cycles')
      .select('id, status, request_deadline, max_requests_per_mentee, program_id')
      .eq('id', cycle_id)
      .single()

    if (cycleError || !cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    if (cycle.status !== 'open') {
      return NextResponse.json({ error: 'Cycle is not open for requests' }, { status: 400 })
    }

    if (cycle.request_deadline && new Date(cycle.request_deadline) < new Date()) {
      return NextResponse.json({ error: 'Request deadline has passed' }, { status: 400 })
    }

    const { data: isParticipant } = await supabase
      .from('program_participants')
      .select('id')
      .eq('program_id', cycle.program_id)
      .eq('profile_id', profile.id)
      .eq('role', 'mentee')
      .single()

    if (!isParticipant) {
      return NextResponse.json({ error: 'You are not a mentee in this program' }, { status: 403 })
    }

    const { data: isMentor } = await supabase
      .from('program_participants')
      .select('id')
      .eq('program_id', cycle.program_id)
      .eq('profile_id', mentor_profile_id)
      .eq('role', 'mentor')
      .single()

    if (!isMentor) {
      return NextResponse.json({ error: 'Selected mentor is not in this program' }, { status: 400 })
    }

    const { data: existingRequest } = await supabase
      .from('mentee_requests')
      .select('id')
      .eq('cycle_id', cycle_id)
      .eq('mentee_profile_id', profile.id)
      .eq('mentor_profile_id', mentor_profile_id)
      .not('status', 'in', '("withdrawn","expired","declined")')
      .single()

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have an active request for this mentor' }, { status: 409 })
    }

    const { data: currentRequests } = await supabase
      .from('mentee_requests')
      .select('id')
      .eq('cycle_id', cycle_id)
      .eq('mentee_profile_id', profile.id)
      .not('status', 'in', '("withdrawn","expired","declined")')

    const maxRequests = cycle.max_requests_per_mentee || 3
    if (currentRequests && currentRequests.length >= maxRequests) {
      return NextResponse.json({
        error: `Maximum requests (${maxRequests}) reached for this cycle`
      }, { status: 400 })
    }

    const { data: newRequest, error: insertError } = await supabase
      .from('mentee_requests')
      .insert({
        cycle_id,
        mentee_profile_id: profile.id,
        mentor_profile_id,
        request_message,
        goal_category,
        priority: priority || (currentRequests?.length || 0) + 1,
        status: 'pending'
      })
      .select(`
        *,
        mentor:profiles!mentee_requests_mentor_profile_id_fkey(
          id, display_name, avatar_url, headline
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating request:', insertError)
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }

    return NextResponse.json({ data: newRequest }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/mentee/requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
