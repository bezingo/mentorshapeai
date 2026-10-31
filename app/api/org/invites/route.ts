import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { sendEmail } from '@/lib/email/client'
import { orgInviteTemplate } from '@/lib/email/templates'

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

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

    let query = supabase
      .from('org_invites')
      .select(`
        *,
        created_by_profile:profiles!org_invites_created_by_fkey(display_name, avatar_url),
        claimed_by_profile:profiles!org_invites_claimed_by_fkey(display_name, avatar_url)
      `, { count: 'exact' })
      .eq('org_id', membership.org_id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invites, count, error } = await query

    if (error) {
      console.error('Error fetching invites:', error)
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
    }

    const bouncedCount = await supabase
      .from('org_invites')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', membership.org_id)
      .not('bounced_at', 'is', null)

    return NextResponse.json({
      data: invites,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats: {
        bounced: bouncedCount.count || 0
      }
    })
  } catch (error) {
    console.error('Error fetching invites:', error)
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
    const { emails, role = 'mentee', language = 'en', metadata = {} } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'At least one email is required' }, { status: 400 })
    }

    if (emails.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 emails per batch' }, { status: 400 })
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
        org_id,
        role,
        org:organizations(id, name, crest_url)
      `)
      .eq('profile_id', profile.id)
      .in('role', ['owner', 'admin', 'career_office'])
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const org = Array.isArray(membership.org) ? membership.org[0] : membership.org
    const results = { sent: 0, skipped: 0, errors: [] as string[] }

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim()

      const { data: existing } = await supabase
        .from('org_invites')
        .select('id, status')
        .eq('org_id', membership.org_id)
        .eq('email', normalizedEmail)
        .in('status', ['pending', 'claimed'])
        .single()

      if (existing) {
        results.skipped++
        continue
      }

      const inviteCode = generateInviteCode()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { data: invite, error: insertError } = await supabase
        .from('org_invites')
        .insert({
          org_id: membership.org_id,
          email: normalizedEmail,
          invite_code: inviteCode,
          role,
          language,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          created_by: profile.id,
          metadata
        })
        .select()
        .single()

      if (insertError) {
        results.errors.push(`${normalizedEmail}: ${insertError.message}`)
        continue
      }

      try {
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join?code=${inviteCode}`
        const emailContent = orgInviteTemplate({
          orgName: org.name,
          inviteCode,
          inviteUrl,
          language,
          crestUrl: org.crest_url
        })

        await sendEmail({
          to: normalizedEmail,
          subject: language === 'ar' 
            ? `دعوة للانضمام إلى ${org.name}`
            : `Invitation to join ${org.name}`,
          html: emailContent
        })

        await supabase
          .from('org_invites')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', invite.id)

        results.sent++
      } catch (emailError) {
        console.error('Email error:', emailError)
        results.errors.push(`${normalizedEmail}: Failed to send email`)
      }
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error('Error creating invites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
