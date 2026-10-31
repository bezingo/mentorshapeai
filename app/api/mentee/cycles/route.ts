import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSession, ensureUserAndProfile } from '@/lib/auth-helpers'

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

    const { data: participations } = await supabase
      .from('program_participants')
      .select('program_id')
      .eq('profile_id', profile.id)
      .eq('role', 'mentee')

    if (!participations || participations.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const programIds = participations.map(p => p.program_id)

    const { data: cycles, error } = await supabase
      .from('program_cycles')
      .select(`
        *,
        program:programs!inner(id, name, org_id)
      `)
      .in('program_id', programIds)
      .in('status', ['open', 'matching', 'active'])
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error fetching cycles:', error)
      return NextResponse.json({ error: 'Failed to fetch cycles' }, { status: 500 })
    }

    const cyclesWithRequestCount = await Promise.all(
      (cycles || []).map(async (cycle) => {
        const { count } = await supabase
          .from('mentee_requests')
          .select('id', { count: 'exact', head: true })
          .eq('cycle_id', cycle.id)
          .eq('mentee_profile_id', profile.id)
          .not('status', 'in', '("withdrawn","expired")')

        return {
          ...cycle,
          my_request_count: count || 0
        }
      })
    )

    return NextResponse.json({ data: cyclesWithRequestCount })
  } catch (error) {
    console.error('Error in GET /api/mentee/cycles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
