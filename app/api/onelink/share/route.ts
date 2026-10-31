import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

function generateShortCode(): string {
  return Math.random().toString(36).substring(2, 10)
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { target_url } = body

    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, public_handle')
      .eq('user_id', session.user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const targetUrl = target_url || `${process.env.NEXT_PUBLIC_APP_URL}/m/${profile.public_handle}`
    const shortCode = generateShortCode()

    const { data: shareLink, error } = await supabase
      .from('share_links')
      .insert({
        profile_id: profile.id,
        short_code: shortCode,
        target_url: targetUrl
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating share link:', error)
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL}/s/${shortCode}`

    return NextResponse.json({
      data: {
        ...shareLink,
        full_url: fullUrl
      }
    })
  } catch (error) {
    console.error('Error in share link creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
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

    const { data: links, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching share links:', error)
      return NextResponse.json({ error: 'Failed to fetch share links' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    const enrichedLinks = (links || []).map(link => ({
      ...link,
      full_url: `${baseUrl}/s/${link.short_code}`
    }))

    return NextResponse.json({ data: enrichedLinks })
  } catch (error) {
    console.error('Error fetching share links:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
