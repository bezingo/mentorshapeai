import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getOrgAdminAccess } from '@/lib/auth/org-access'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const access = await getOrgAdminAccess(supabase, session.user.id)

    if (!access) {
      return NextResponse.json({ error: 'No admin access' }, { status: 403 })
    }

    const { data: programs, error } = await supabase
      .from('programs')
      .select(`
        *,
        participants:program_participants(count),
        matches:matches(count)
      `)
      .eq('org_id', access.orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching programs:', error)
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
    }

    return NextResponse.json({ data: programs })
  } catch (error) {
    console.error('Error in programs GET:', error)
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
    const { name, description, start_date, end_date, max_mentees_per_mentor, matching_criteria, term, academic_year } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const access = await getOrgAdminAccess(supabase, session.user.id)

    if (!access) {
      return NextResponse.json({ error: 'No admin access' }, { status: 403 })
    }

    const { data: program, error } = await supabase
      .from('programs')
      .insert({
        org_id: access.orgId,
        name,
        description,
        start_date,
        end_date,
        max_mentees_per_mentor: max_mentees_per_mentor || 3,
        matching_criteria: matching_criteria || {},
        term,
        academic_year,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating program:', error)
      return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
    }

    return NextResponse.json({ data: program }, { status: 201 })
  } catch (error) {
    console.error('Error in programs POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
