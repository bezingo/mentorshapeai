import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSession, ensureUserAndProfile } from '@/lib/auth-helpers'
import { z } from 'zod'

const UpdateRequestSchema = z.object({
  request_message: z.string().max(1000).optional(),
  goal_category: z.enum(['finance', 'career', 'personal_growth', 'entrepreneurship']).optional().nullable(),
  priority: z.number().int().min(1).max(10).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id } = await params
    const supabase = createServiceClient()

    const { data: req, error } = await supabase
      .from('mentee_requests')
      .select(`
        *,
        cycle:program_cycles!inner(
          id, name, name_ar, status, request_deadline,
          program:programs!inner(id, name)
        ),
        mentor:profiles!mentee_requests_mentor_profile_id_fkey(
          id, display_name, avatar_url, headline, bio, expertise_areas, languages
        )
      `)
      .eq('id', id)
      .eq('mentee_profile_id', profile.id)
      .single()

    if (error || !req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    return NextResponse.json({ data: req })
  } catch (error) {
    console.error('Error in GET /api/mentee/requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = UpdateRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.errors
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: existingReq } = await supabase
      .from('mentee_requests')
      .select('id, status')
      .eq('id', id)
      .eq('mentee_profile_id', profile.id)
      .single()

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (existingReq.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending requests can be updated' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('mentee_requests')
      .update(parsed.data)
      .eq('id', id)
      .select(`
        *,
        mentor:profiles!mentee_requests_mentor_profile_id_fkey(
          id, display_name, avatar_url, headline
        )
      `)
      .single()

    if (error) {
      console.error('Error updating request:', error)
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error in PATCH /api/mentee/requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureUserAndProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id } = await params
    const supabase = createServiceClient()

    const { data: existingReq } = await supabase
      .from('mentee_requests')
      .select('id, status')
      .eq('id', id)
      .eq('mentee_profile_id', profile.id)
      .single()

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (!['pending', 'approved'].includes(existingReq.status)) {
      return NextResponse.json({ error: 'This request cannot be withdrawn' }, { status: 400 })
    }

    const { error } = await supabase
      .from('mentee_requests')
      .update({ status: 'withdrawn' })
      .eq('id', id)

    if (error) {
      console.error('Error withdrawing request:', error)
      return NextResponse.json({ error: 'Failed to withdraw request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/mentee/requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
