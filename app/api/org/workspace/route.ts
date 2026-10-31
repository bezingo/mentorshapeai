import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      .select(`
        role,
        org:organizations(
          id,
          name,
          crest_url,
          allowed_domains,
          verified_domains,
          invite_link_code,
          invite_link_enabled,
          is_school,
          org_type,
          settings,
          max_members,
          billing_email,
          created_at
        )
      `)
      .eq('profile_id', profile.id)
      .in('role', ['owner', 'admin', 'career_office'])
      .single()

    if (!membership?.org) {
      return NextResponse.json({ error: 'No organization found or insufficient permissions' }, { status: 404 })
    }

    const org = Array.isArray(membership.org) ? membership.org[0] : membership.org

    const { count: memberCount } = await supabase
      .from('org_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id)

    return NextResponse.json({
      data: {
        ...org,
        member_count: memberCount || 0,
        user_role: membership.role
      }
    })
  } catch (error) {
    console.error('Error fetching org workspace:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, org_type, allowed_domains, is_school } = body

    if (!name || !org_type) {
      return NextResponse.json({ error: 'Name and org_type are required' }, { status: 400 })
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

    const { data: existingMembership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('profile_id', profile.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (existingMembership) {
      return NextResponse.json({ error: 'You already manage an organization' }, { status: 400 })
    }

    const inviteLinkCode = Math.random().toString(36).substring(2, 14)

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        org_type,
        is_school: is_school ?? (org_type === 'school'),
        allowed_domains: allowed_domains || [],
        invite_link_code: inviteLinkCode,
        invite_link_enabled: true
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating org:', orgError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: org.id,
        profile_id: profile.id,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Error creating membership:', memberError)
      await supabase.from('organizations').delete().eq('id', org.id)
      return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 })
    }

    return NextResponse.json({ data: org }, { status: 201 })
  } catch (error) {
    console.error('Error creating org:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, crest_url, allowed_domains, invite_link_enabled, settings, billing_email } = body

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
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found or insufficient permissions' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (crest_url !== undefined) updates.crest_url = crest_url
    if (allowed_domains !== undefined) updates.allowed_domains = allowed_domains
    if (invite_link_enabled !== undefined) updates.invite_link_enabled = invite_link_enabled
    if (settings !== undefined) updates.settings = settings
    if (billing_email !== undefined) updates.billing_email = billing_email

    const { data: org, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', membership.org_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating org:', error)
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    }

    return NextResponse.json({ data: org })
  } catch (error) {
    console.error('Error updating org:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
