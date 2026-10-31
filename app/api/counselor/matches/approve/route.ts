import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getOrgAdminAccess } from '@/lib/auth/org-access'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { match_ids, action } = body

    if (!match_ids || !Array.isArray(match_ids) || match_ids.length === 0) {
      return NextResponse.json({ error: 'match_ids array is required' }, { status: 400 })
    }

    if (!action || !['approve', 'decline', 'swap'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve, decline, or swap' }, { status: 400 })
    }

    const supabase = await createClient()
    const access = await getOrgAdminAccess(supabase, session.user.id)

    if (!access) {
      return NextResponse.json({ error: 'No admin access' }, { status: 403 })
    }

    const { data: matches } = await supabase
      .from('matches')
      .select('id, program_id, program:programs!matches_program_id_fkey(org_id)')
      .in('id', match_ids)

    if (!matches || matches.length === 0) {
      return NextResponse.json({ error: 'No valid matches found' }, { status: 404 })
    }

    const validMatchIds = matches
      .filter(m => {
        const program = Array.isArray(m.program) ? m.program[0] : m.program
        return program?.org_id === access.orgId
      })
      .map(m => m.id)

    if (validMatchIds.length === 0) {
      return NextResponse.json({ error: 'No matches in your organization' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {
      approved_by: access.profileId,
      approved_at: new Date().toISOString()
    }

    if (action === 'approve') {
      updateData.status = 'approved'
    } else if (action === 'decline') {
      updateData.status = 'declined'
    }

    const { data: updated, error } = await supabase
      .from('matches')
      .update(updateData)
      .in('id', validMatchIds)
      .select()

    if (error) {
      console.error('Error updating matches:', error)
      return NextResponse.json({ error: 'Failed to update matches' }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        updated: updated?.length || 0,
        action
      }
    })
  } catch (error) {
    console.error('Error in match approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
