import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/counselor/reports/term
 * Generate term report: sessions held, grades, action items, mentor sources
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
        org:organizations!org_members_org_id_fkey(id, name)
      `)
      .eq('profile_id', profile.id)
      .eq('role', 'admin')
      .single()

    if (!adminMembership) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only school administrators can access reports' } },
        { status: 403 }
      )
    }

    const orgId = adminMembership.org_id
    const org = Array.isArray(adminMembership.org) ? adminMembership.org[0] : adminMembership.org

    // Get URL params for date range
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0]
    const format = searchParams.get('format') || 'json' // json or csv

    // Fetch all collaborations in the org
    const { data: collaborations } = await supabase
      .from('collaborations')
      .select(`
        id,
        status,
        started_at,
        completed_at,
        mentor_profile_id,
        mentee_profile_id,
        goal:goals!collaborations_goal_id_fkey(id, title, category),
        mentor:profiles!collaborations_mentor_profile_id_fkey(id, display_name),
        mentee:profiles!collaborations_mentee_profile_id_fkey(id, display_name)
      `)
      .eq('org_id', orgId)

    // Fetch completed focuses within date range
    const { data: focuses } = await supabase
      .from('focuses')
      .select(`
        id,
        scheduled_at,
        completed_at,
        status,
        duration_minutes,
        collaboration_id
      `)
      .eq('status', 'completed')
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)

    // Filter focuses to org collaborations
    const collabIds = new Set((collaborations || []).map(c => c.id))
    const orgFocuses = (focuses || []).filter(f => collabIds.has(f.collaboration_id))

    // Fetch grades for org focuses
    const focusIds = orgFocuses.map(f => f.id)
    const { data: grades } = await supabase
      .from('focus_grades')
      .select('id, focus_id, grader_role, usefulness_rating, honesty_rating')
      .in('focus_id', focusIds.length > 0 ? focusIds : ['none'])

    // Fetch action items for org collaborations
    const { data: actionItems } = await supabase
      .from('action_items')
      .select('id, collaboration_id, status, completed_at')
      .in('collaboration_id', Array.from(collabIds).length > 0 ? Array.from(collabIds) : ['none'])

    // Fetch org members to determine mentor source
    const { data: orgMembers } = await supabase
      .from('org_members')
      .select('profile_id, role')
      .eq('org_id', orgId)

    const orgMentorIds = new Set(
      (orgMembers || [])
        .filter(m => m.role === 'mentor' || m.role === 'admin')
        .map(m => m.profile_id)
    )

    // Build report data
    const reportRows: Array<{
      mentee_name: string
      mentor_name: string
      goal_title: string
      goal_category: string
      sessions_held: number
      sessions_with_both_grades: number
      avg_usefulness_mentor: number | null
      avg_usefulness_mentee: number | null
      avg_honesty_mentor: number | null
      avg_honesty_mentee: number | null
      action_items_total: number
      action_items_completed: number
      mentor_source: 'in_roster' | 'external'
      collaboration_status: string
    }> = []

    for (const collab of collaborations || []) {
      const goal = Array.isArray(collab.goal) ? collab.goal[0] : collab.goal
      const mentor = Array.isArray(collab.mentor) ? collab.mentor[0] : collab.mentor
      const mentee = Array.isArray(collab.mentee) ? collab.mentee[0] : collab.mentee

      const collabFocuses = orgFocuses.filter(f => f.collaboration_id === collab.id)
      const collabGrades = (grades || []).filter(g => 
        collabFocuses.some(f => f.id === g.focus_id)
      )
      const collabActionItems = (actionItems || []).filter(ai => ai.collaboration_id === collab.id)

      // Calculate averages
      const mentorGrades = collabGrades.filter(g => g.grader_role === 'mentor')
      const menteeGrades = collabGrades.filter(g => g.grader_role === 'mentee')

      const avgUsefulnessMentor = mentorGrades.length > 0
        ? mentorGrades.reduce((sum, g) => sum + g.usefulness_rating, 0) / mentorGrades.length
        : null
      const avgUsefulnessMentee = menteeGrades.length > 0
        ? menteeGrades.reduce((sum, g) => sum + g.usefulness_rating, 0) / menteeGrades.length
        : null
      const avgHonestyMentor = mentorGrades.length > 0
        ? mentorGrades.reduce((sum, g) => sum + g.honesty_rating, 0) / mentorGrades.length
        : null
      const avgHonestyMentee = menteeGrades.length > 0
        ? menteeGrades.reduce((sum, g) => sum + g.honesty_rating, 0) / menteeGrades.length
        : null

      // Count sessions with both grades
      const focusGradeCounts = new Map<string, Set<string>>()
      for (const g of collabGrades) {
        if (!focusGradeCounts.has(g.focus_id)) {
          focusGradeCounts.set(g.focus_id, new Set())
        }
        focusGradeCounts.get(g.focus_id)!.add(g.grader_role)
      }
      const sessionsWithBothGrades = Array.from(focusGradeCounts.values())
        .filter(roles => roles.has('mentor') && roles.has('mentee')).length

      reportRows.push({
        mentee_name: mentee?.display_name || 'Unknown',
        mentor_name: mentor?.display_name || 'Unknown',
        goal_title: goal?.title || 'Untitled',
        goal_category: goal?.category || 'N/A',
        sessions_held: collabFocuses.length,
        sessions_with_both_grades: sessionsWithBothGrades,
        avg_usefulness_mentor: avgUsefulnessMentor ? Math.round(avgUsefulnessMentor * 10) / 10 : null,
        avg_usefulness_mentee: avgUsefulnessMentee ? Math.round(avgUsefulnessMentee * 10) / 10 : null,
        avg_honesty_mentor: avgHonestyMentor ? Math.round(avgHonestyMentor * 10) / 10 : null,
        avg_honesty_mentee: avgHonestyMentee ? Math.round(avgHonestyMentee * 10) / 10 : null,
        action_items_total: collabActionItems.length,
        action_items_completed: collabActionItems.filter(ai => ai.status === 'completed').length,
        mentor_source: orgMentorIds.has(collab.mentor_profile_id) ? 'in_roster' : 'external',
        collaboration_status: collab.status,
      })
    }

    // Summary stats
    const summary = {
      report_period: { start_date: startDate, end_date: endDate },
      organization: org?.name || 'Unknown',
      total_collaborations: reportRows.length,
      total_sessions: reportRows.reduce((sum, r) => sum + r.sessions_held, 0),
      total_sessions_graded: reportRows.reduce((sum, r) => sum + r.sessions_with_both_grades, 0),
      total_action_items: reportRows.reduce((sum, r) => sum + r.action_items_total, 0),
      action_items_completed: reportRows.reduce((sum, r) => sum + r.action_items_completed, 0),
      in_roster_mentors: reportRows.filter(r => r.mentor_source === 'in_roster').length,
      external_mentors: reportRows.filter(r => r.mentor_source === 'external').length,
      avg_usefulness_overall: (() => {
        const allUseful = reportRows.flatMap(r => [r.avg_usefulness_mentor, r.avg_usefulness_mentee].filter(Boolean) as number[])
        return allUseful.length > 0 ? Math.round(allUseful.reduce((a, b) => a + b, 0) / allUseful.length * 10) / 10 : null
      })(),
    }

    // Return CSV if requested
    if (format === 'csv') {
      const csvHeaders = [
        'Mentee', 'Mentor', 'Goal', 'Category', 'Sessions', 'Graded Sessions',
        'Usefulness (Mentor)', 'Usefulness (Mentee)', 'Honesty (Mentor)', 'Honesty (Mentee)',
        'Action Items', 'Completed', 'Mentor Source', 'Status'
      ].join(',')

      const csvRows = reportRows.map(r => [
        `"${r.mentee_name}"`,
        `"${r.mentor_name}"`,
        `"${r.goal_title}"`,
        `"${r.goal_category}"`,
        r.sessions_held,
        r.sessions_with_both_grades,
        r.avg_usefulness_mentor ?? '',
        r.avg_usefulness_mentee ?? '',
        r.avg_honesty_mentor ?? '',
        r.avg_honesty_mentee ?? '',
        r.action_items_total,
        r.action_items_completed,
        r.mentor_source,
        r.collaboration_status,
      ].join(','))

      const csv = [csvHeaders, ...csvRows].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="term-report-${startDate}-${endDate}.csv"`,
        },
      })
    }

    return NextResponse.json({
      data: {
        summary,
        collaborations: reportRows,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/counselor/reports/term:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate report' } },
      { status: 500 }
    )
  }
}
