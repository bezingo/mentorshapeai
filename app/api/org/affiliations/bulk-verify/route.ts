import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { affiliation_ids, action } = body

    if (!affiliation_ids || !Array.isArray(affiliation_ids) || affiliation_ids.length === 0) {
      return NextResponse.json({ error: 'affiliation_ids array is required' }, { status: 400 })
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('profile_id', profile.id)
      .in('role', ['owner', 'admin', 'career_office'])
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: affiliations } = await supabase
      .from('affiliations')
      .select('id, profile_id')
      .in('id', affiliation_ids)
      .eq('org_id', membership.org_id)
      .eq('status', 'pending')

    if (!affiliations || affiliations.length === 0) {
      return NextResponse.json({ error: 'No valid pending affiliations found' }, { status: 400 })
    }

    const validIds = affiliations.map(a => a.id)

    const { error } = await supabase
      .from('affiliations')
      .update({
        status: action === 'approve' ? 'verified' : 'rejected',
        verified_by: profile.id,
        verified_at: new Date().toISOString()
      })
      .in('id', validIds)

    if (error) {
      console.error('Error bulk updating affiliations:', error)
      return NextResponse.json({ error: 'Failed to update affiliations' }, { status: 500 })
    }

    if (action === 'approve') {
      const profileIds = affiliations.map(a => a.profile_id)
      for (const pid of profileIds) {
        await supabase.rpc('refresh_verified_affiliations', { p_profile_id: pid })
      }
    }

    return NextResponse.json({
      data: {
        updated: validIds.length,
        action
      }
    })
  } catch (error) {
    console.error('Error bulk verifying affiliations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
