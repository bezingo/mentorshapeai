import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getOrgAdminAccess } from '@/lib/auth/org-access'

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('program_id')
    const menteeProfileId = searchParams.get('mentee_profile_id')

    if (!programId) {
      return NextResponse.json({ error: 'program_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const access = await getOrgAdminAccess(supabase, session.user.id)

    if (!access) {
      return NextResponse.json({ error: 'No admin access' }, { status: 403 })
    }

    const { data: program } = await supabase
      .from('programs')
      .select('id, org_id')
      .eq('id', programId)
      .eq('org_id', access.orgId)
      .single()

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const { data: suggestions, error } = await supabase
      .rpc('generate_match_suggestions', {
        p_program_id: programId,
        p_mentee_profile_id: menteeProfileId || null
      })

    if (error) {
      console.error('Error generating suggestions:', error)
      return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
    }

    const menteeIds = [...new Set(suggestions?.map((s: { mentee_profile_id: string }) => s.mentee_profile_id) || [])]
    const mentorIds = [...new Set(suggestions?.map((s: { mentor_profile_id: string }) => s.mentor_profile_id) || [])]
    const allProfileIds = [...new Set([...menteeIds, ...mentorIds])]

    let profiles: Record<string, { display_name: string; avatar_url: string | null; locale: string | null }> = {}
    if (allProfileIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, locale')
        .in('id', allProfileIds)

      if (profilesData) {
        profiles = Object.fromEntries(profilesData.map(p => [p.id, p]))
      }
    }

    const enrichedSuggestions = (suggestions || []).map((s: { mentee_profile_id: string; mentor_profile_id: string; match_score: number; reasons: string[] }) => ({
      ...s,
      mentee: profiles[s.mentee_profile_id] || null,
      mentor: profiles[s.mentor_profile_id] || null
    }))

    return NextResponse.json({ data: enrichedSuggestions })
  } catch (error) {
    console.error('Error in match suggestions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
