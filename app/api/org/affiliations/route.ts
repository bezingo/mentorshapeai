import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const isAdmin = searchParams.get('admin') === 'true'

    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (isAdmin) {
      const { data: membership } = await supabase
        .from('org_members')
        .select('org_id, role')
        .eq('profile_id', profile.id)
        .in('role', ['owner', 'admin', 'career_office'])
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      let query = supabase
        .from('affiliations')
        .select(`
          *,
          profile:profiles(id, display_name, avatar_url, email:user_id),
          org:organizations(id, name),
          programme:programs(id, name),
          verified_by_profile:profiles!affiliations_verified_by_fkey(display_name)
        `)
        .eq('org_id', membership.org_id)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data: affiliations, error } = await query

      if (error) {
        console.error('Error fetching affiliations:', error)
        return NextResponse.json({ error: 'Failed to fetch affiliations' }, { status: 500 })
      }

      return NextResponse.json({ data: affiliations })
    } else {
      const { data: affiliations, error } = await supabase
        .from('affiliations')
        .select(`
          *,
          org:organizations(id, name, crest_url),
          programme:programs(id, name)
        `)
        .eq('profile_id', profile.id)

      if (error) {
        console.error('Error fetching affiliations:', error)
        return NextResponse.json({ error: 'Failed to fetch affiliations' }, { status: 500 })
      }

      return NextResponse.json({ data: affiliations })
    }
  } catch (error) {
    console.error('Error fetching affiliations:', error)
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
    const { org_id, kind, programme_id, graduation_year, department, student_id, evidence_url, evidence_notes } = body

    if (!org_id || !kind) {
      return NextResponse.json({ error: 'org_id and kind are required' }, { status: 400 })
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

    const { data: existing } = await supabase
      .from('affiliations')
      .select('id, status')
      .eq('profile_id', profile.id)
      .eq('org_id', org_id)
      .single()

    if (existing) {
      if (existing.status === 'verified') {
        return NextResponse.json({ error: 'You already have a verified affiliation with this organization' }, { status: 400 })
      }
      if (existing.status === 'pending') {
        return NextResponse.json({ error: 'You already have a pending affiliation request' }, { status: 400 })
      }
    }

    const emailDomain = session.user.email?.split('@')[1]
    let autoVerify = false

    if (emailDomain) {
      const { data: org } = await supabase
        .from('organizations')
        .select('allowed_domains, verified_domains')
        .eq('id', org_id)
        .single()

      if (org) {
        const allDomains = [...(org.allowed_domains || []), ...(org.verified_domains || [])]
        autoVerify = allDomains.includes(emailDomain)
      }
    }

    const { data: affiliation, error } = await supabase
      .from('affiliations')
      .upsert({
        id: existing?.id,
        profile_id: profile.id,
        org_id,
        kind,
        programme_id,
        graduation_year,
        department,
        student_id,
        evidence_url,
        evidence_notes,
        status: autoVerify ? 'verified' : 'pending',
        verified_at: autoVerify ? new Date().toISOString() : null
      })
      .select(`
        *,
        org:organizations(id, name, crest_url)
      `)
      .single()

    if (error) {
      console.error('Error creating affiliation:', error)
      return NextResponse.json({ error: 'Failed to create affiliation' }, { status: 500 })
    }

    if (autoVerify) {
      await supabase.rpc('refresh_verified_affiliations', { p_profile_id: profile.id })
    }

    return NextResponse.json({
      data: affiliation,
      auto_verified: autoVerify
    })
  } catch (error) {
    console.error('Error creating affiliation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
