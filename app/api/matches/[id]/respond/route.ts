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
    const { accept, reason } = body

    if (typeof accept !== 'boolean') {
      return NextResponse.json({ error: 'accept (boolean) is required' }, { status: 400 })
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

    const { data: match } = await supabase
      .from('matches')
      .select('id, mentor_profile_id, mentee_profile_id, status')
      .eq('id', id)
      .single()

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const isMentor = match.mentor_profile_id === profile.id
    const isMentee = match.mentee_profile_id === profile.id

    if (!isMentor && !isMentee) {
      return NextResponse.json({ error: 'You are not part of this match' }, { status: 403 })
    }

    if (!['approved', 'intro_sent'].includes(match.status)) {
      return NextResponse.json({ error: 'Match is not awaiting response' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (isMentor) {
      updateData.mentor_accept = accept
      updateData.mentor_accept_at = new Date().toISOString()
    } else {
      updateData.mentee_accept = accept
      updateData.mentee_accept_at = new Date().toISOString()
    }

    if (!accept && reason) {
      updateData.declined_reason = reason
      updateData.status = 'declined'
    }

    const { data: updated, error } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating match:', error)
      return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error responding to match:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        *,
        program:programs(name, description),
        mentor:profiles!matches_mentor_profile_id_fkey(display_name, avatar_url, headline),
        mentee:profiles!matches_mentee_profile_id_fkey(display_name, avatar_url, headline)
      `)
      .eq('id', id)
      .or(`mentor_profile_id.eq.${profile.id},mentee_profile_id.eq.${profile.id}`)
      .single()

    if (error || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const isMentor = match.mentor_profile_id === profile.id

    return NextResponse.json({
      data: {
        ...match,
        your_role: isMentor ? 'mentor' : 'mentee',
        your_response: isMentor ? match.mentor_accept : match.mentee_accept,
        partner_response: isMentor ? match.mentee_accept : match.mentor_accept
      }
    })
  } catch (error) {
    console.error('Error fetching match:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
