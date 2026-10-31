import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, rejection_reason } = body

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

    const { data: affiliation } = await supabase
      .from('affiliations')
      .select('*, org:organizations(id)')
      .eq('id', id)
      .single()

    if (!affiliation) {
      return NextResponse.json({ error: 'Affiliation not found' }, { status: 404 })
    }

    const org = Array.isArray(affiliation.org) ? affiliation.org[0] : affiliation.org

    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', org.id)
      .eq('profile_id', profile.id)
      .in('role', ['owner', 'admin', 'career_office'])
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {
      status: action === 'approve' ? 'verified' : 'rejected',
      verified_by: profile.id,
      verified_at: new Date().toISOString()
    }

    if (action === 'reject' && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    const { data: updated, error } = await supabase
      .from('affiliations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating affiliation:', error)
      return NextResponse.json({ error: 'Failed to update affiliation' }, { status: 500 })
    }

    if (action === 'approve') {
      await supabase.rpc('refresh_verified_affiliations', { p_profile_id: affiliation.profile_id })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error verifying affiliation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
