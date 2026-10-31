import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrgAdminAccess } from '@/lib/auth/org-access'
import { getSession } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const access = await getOrgAdminAccess(supabase, session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const cycleId = searchParams.get('cycle_id')
    const status = searchParams.get('status')
    const mentorId = searchParams.get('mentor_id')

    if (!cycleId) {
      return NextResponse.json({ error: 'cycle_id is required' }, { status: 400 })
    }

    const { data: cycle } = await supabase
      .from('program_cycles')
      .select('id, program:programs!inner(org_id)')
      .eq('id', cycleId)
      .single()

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    const cycleProgram = cycle.program as unknown as { org_id: string }
    if (cycleProgram.org_id !== access.orgId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let query = supabase
      .from('mentee_requests')
      .select(`
        *,
        mentee:profiles!mentee_requests_mentee_profile_id_fkey(
          id, display_name, avatar_url, headline, locale
        ),
        mentor:profiles!mentee_requests_mentor_profile_id_fkey(
          id, display_name, avatar_url, headline, expertise_areas
        ),
        approved_by_profile:profiles!mentee_requests_approved_by_fkey(
          id, display_name
        ),
        match:matches(id, status)
      `)
      .eq('cycle_id', cycleId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }
    if (mentorId) {
      query = query.eq('mentor_profile_id', mentorId)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Error fetching requests:', error)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    return NextResponse.json({ data: requests })
  } catch (error) {
    console.error('Error in GET /api/counselor/requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
