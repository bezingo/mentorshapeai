import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSession, ensureUserAndProfile } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id: cycleId } = await params
    const supabase = createServiceClient()

    const { data: cycle, error: cycleError } = await supabase
      .from('program_cycles')
      .select(`
        id, status, program_id,
        program:programs!inner(id, max_mentees_per_mentor)
      `)
      .eq('id', cycleId)
      .single()

    if (cycleError || !cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
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

    const { data: mentors } = await supabase
      .from('program_participants')
      .select(`
        profile_id,
        profile:profiles!inner(
          id, display_name, avatar_url, headline, bio,
          expertise_areas, languages, locale, timezone
        )
      `)
      .eq('program_id', cycle.program_id)
      .eq('role', 'mentor')

    if (!mentors || mentors.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const maxMentees = (cycle.program as { max_mentees_per_mentor?: number }).max_mentees_per_mentor || 3

    const enrichedMentors = await Promise.all(
      mentors.map(async (m) => {
        const mentor = m.profile as unknown as {
          id: string
          display_name: string | null
          avatar_url: string | null
          headline: string | null
          bio: string | null
          expertise_areas: string[] | null
          languages: string[] | null
          locale: string | null
          timezone: string | null
        }

        const { count: matchCount } = await supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .eq('mentor_profile_id', mentor.id)
          .eq('program_id', cycle.program_id)
          .not('status', 'eq', 'declined')

        const { count: requestCount } = await supabase
          .from('mentee_requests')
          .select('id', { count: 'exact', head: true })
          .eq('mentor_profile_id', mentor.id)
          .eq('cycle_id', cycleId)
          .eq('status', 'pending')

        const { data: myRequest } = await supabase
          .from('mentee_requests')
          .select('id, status')
          .eq('cycle_id', cycleId)
          .eq('mentee_profile_id', profile.id)
          .eq('mentor_profile_id', mentor.id)
          .not('status', 'in', '("withdrawn","expired")')
          .single()

        const { data: offers } = await supabase
          .from('mentor_offers')
          .select('id, title, category, description')
          .eq('profile_id', mentor.id)
          .eq('is_active', true)

        const available = (matchCount || 0) < maxMentees

        return {
          ...mentor,
          current_mentee_count: matchCount || 0,
          pending_request_count: requestCount || 0,
          max_mentees: maxMentees,
          is_available: available,
          my_request: myRequest || null,
          offers: offers || []
        }
      })
    )

    return NextResponse.json({ data: enrichedMentors })
  } catch (error) {
    console.error('Error in GET /api/mentee/cycles/[id]/mentors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
