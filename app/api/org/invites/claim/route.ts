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
    const { invite_code, auto_domain } = body

    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let invite = null
    let org = null

    if (invite_code) {
      const { data: inviteData, error: inviteError } = await supabase
        .from('org_invites')
        .select(`
          *,
          org:organizations(id, name, crest_url, is_school, org_type)
        `)
        .eq('invite_code', invite_code.toUpperCase())
        .eq('status', 'pending')
        .single()

      if (inviteError || !inviteData) {
        return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 })
      }

      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        await supabase
          .from('org_invites')
          .update({ status: 'expired' })
          .eq('id', inviteData.id)
        return NextResponse.json({ error: 'Invite code has expired' }, { status: 400 })
      }

      invite = inviteData
      org = Array.isArray(inviteData.org) ? inviteData.org[0] : inviteData.org
    } else if (auto_domain) {
      const emailDomain = session.user.email?.split('@')[1]
      if (!emailDomain) {
        return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
      }

      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, crest_url, is_school, org_type, allowed_domains, verified_domains')
        .or(`allowed_domains.cs.{${emailDomain}},verified_domains.cs.{${emailDomain}}`)
        .single()

      if (!orgData) {
        return NextResponse.json({ error: 'No organization found for your email domain' }, { status: 404 })
      }

      org = orgData
    } else {
      return NextResponse.json({ error: 'Either invite_code or auto_domain is required' }, { status: 400 })
    }

    const { data: existingMember } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', org.id)
      .eq('profile_id', profile.id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this organization' }, { status: 400 })
    }

    const role = invite?.role || 'mentee'

    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: org.id,
        profile_id: profile.id,
        role,
        status: 'active',
        joined_at: new Date().toISOString(),
        invited_email: session.user.email
      })

    if (memberError) {
      console.error('Error creating membership:', memberError)
      return NextResponse.json({ error: 'Failed to join organization' }, { status: 500 })
    }

    if (invite) {
      await supabase
        .from('org_invites')
        .update({
          status: 'claimed',
          claimed_by: profile.id,
          claimed_at: new Date().toISOString()
        })
        .eq('id', invite.id)
    }

    return NextResponse.json({
      data: {
        org_id: org.id,
        org_name: org.name,
        role,
        joined_via: invite ? 'invite_code' : 'domain_auto_join'
      }
    })
  } catch (error) {
    console.error('Error claiming invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
