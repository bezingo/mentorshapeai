import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/counselor/dashboard
 * Get counselor dashboard data: pairs, focuses, action items, reports
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const supabase = createServiceClient()

    // Check if user is an org admin
    const { data: adminMembership } = await supabase
      .from('org_members')
      .select(`
        org_id,
        org:organizations!org_members_org_id_fkey(
          id,
          name,
          logo_url,
          is_school,
          require_consent
        )
      `)
      .eq('profile_id', profile.id)
      .eq('role', 'admin')
      .single()

    if (!adminMembership) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only school administrators can access the dashboard' } },
        { status: 403 }
      )
    }

    const orgId = adminMembership.org_id
    const org = Array.isArray(adminMembership.org) ? adminMembership.org[0] : adminMembership.org

    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Fetch all org members with their profiles
    const { data: members } = await supabase
      .from('org_members')
      .select(`
        id,
        role,
        status,
        year_grade,
        invited_email,
        joined_at,
        profile:profiles!org_members_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          consent_given
        )
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    // Fetch active collaborations in the org
    const { data: collaborations } = await supabase
      .from('collaborations')
      .select(`
        id,
        status,
        started_at,
        goal:goals!collaborations_goal_id_fkey(id, title, category, status),
        mentor:profiles!collaborations_mentor_profile_id_fkey(id, display_name, avatar_url),
        mentee:profiles!collaborations_mentee_profile_id_fkey(id, display_name, avatar_url)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    // Fetch upcoming focuses (next 7 days)
    const { data: upcomingFocuses } = await supabase
      .from('focuses')
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        status,
        meeting_url,
        collaboration:collaborations!focuses_collaboration_id_fkey(
          id,
          org_id,
          mentor:profiles!collaborations_mentor_profile_id_fkey(id, display_name),
          mentee:profiles!collaborations_mentee_profile_id_fkey(id, display_name)
        )
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', sevenDaysFromNow.toISOString())
      .order('scheduled_at', { ascending: true })

    // Filter to only org focuses
    const orgUpcomingFocuses = (upcomingFocuses || []).filter((f) => {
      const collab = Array.isArray(f.collaboration) ? f.collaboration[0] : f.collaboration
      return collab?.org_id === orgId
    })

    // Fetch recent no-shows (completed/cancelled with no_show status in last 7 days)
    const { data: recentNoShows } = await supabase
      .from('focuses')
      .select(`
        id,
        scheduled_at,
        status,
        collaboration:collaborations!focuses_collaboration_id_fkey(
          id,
          org_id,
          mentor:profiles!collaborations_mentor_profile_id_fkey(id, display_name),
          mentee:profiles!collaborations_mentee_profile_id_fkey(id, display_name)
        )
      `)
      .eq('status', 'no_show')
      .gte('scheduled_at', sevenDaysAgo.toISOString())
      .order('scheduled_at', { ascending: false })

    const orgNoShows = (recentNoShows || []).filter((f) => {
      const collab = Array.isArray(f.collaboration) ? f.collaboration[0] : f.collaboration
      return collab?.org_id === orgId
    })

    // Fetch overdue action items
    const { data: overdueItems } = await supabase
      .from('action_items')
      .select(`
        id,
        title,
        due_date,
        status,
        assignee:profiles!action_items_assignee_profile_id_fkey(id, display_name),
        collaboration:collaborations!action_items_collaboration_id_fkey(
          id,
          org_id,
          goal:goals!collaborations_goal_id_fkey(title)
        )
      `)
      .eq('status', 'pending')
      .lt('due_date', now.toISOString().split('T')[0])
      .order('due_date', { ascending: true })

    const orgOverdueItems = (overdueItems || []).filter((item) => {
      const collab = Array.isArray(item.collaboration) ? item.collaboration[0] : item.collaboration
      return collab?.org_id === orgId
    })

    // Fetch pending safeguarding reports
    const { data: pendingReports } = await supabase
      .from('safeguarding_reports')
      .select(`
        id,
        report_type,
        description,
        status,
        created_at,
        reporter:profiles!safeguarding_reports_reporter_profile_id_fkey(id, display_name),
        reported:profiles!safeguarding_reports_reported_profile_id_fkey(id, display_name)
      `)
      .eq('org_id', orgId)
      .in('status', ['pending', 'reviewing'])
      .order('created_at', { ascending: false })

    // Fetch goals of org members
    const memberProfileIds = (members || [])
      .filter(m => m.profile)
      .map(m => {
        const p = Array.isArray(m.profile) ? m.profile[0] : m.profile
        return p?.id
      })
      .filter(Boolean)

    const { data: memberGoals } = await supabase
      .from('goals')
      .select(`
        id,
        title,
        category,
        status,
        created_at,
        profile:profiles!goals_profile_id_fkey(id, display_name)
      `)
      .in('profile_id', memberProfileIds)
      .order('created_at', { ascending: false })
      .limit(50)

    // Calculate stats
    const stats = {
      total_members: members?.length || 0,
      active_members: members?.filter(m => m.status === 'active').length || 0,
      pending_invites: members?.filter(m => m.status === 'pending').length || 0,
      mentors: members?.filter(m => m.role === 'mentor').length || 0,
      mentees: members?.filter(m => m.role === 'mentee').length || 0,
      active_collaborations: collaborations?.filter(c => c.status === 'active').length || 0,
      upcoming_focuses: orgUpcomingFocuses.length,
      recent_no_shows: orgNoShows.length,
      overdue_action_items: orgOverdueItems.length,
      pending_reports: pendingReports?.length || 0,
      consent_pending: members?.filter(m => {
        const p = Array.isArray(m.profile) ? m.profile[0] : m.profile
        return p && !p.consent_given
      }).length || 0,
    }

    return NextResponse.json({
      data: {
        organization: org,
        stats,
        members: members || [],
        collaborations: collaborations || [],
        upcoming_focuses: orgUpcomingFocuses,
        no_shows: orgNoShows,
        overdue_action_items: orgOverdueItems,
        pending_reports: pendingReports || [],
        member_goals: memberGoals || [],
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/counselor/dashboard:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard data' } },
      { status: 500 }
    )
  }
}
