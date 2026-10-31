import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrgAdminAccess } from '@/lib/auth/org-access'
import { getSession } from '@/lib/auth-helpers'
import { z } from 'zod'

const UpdateRequestSchema = z.object({
  status: z.enum(['approved', 'declined']).optional(),
  admin_notes: z.string().max(1000).optional().nullable(),
  declined_reason: z.string().max(500).optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const access = await getOrgAdminAccess(supabase, session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
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

    const { data: existingReq } = await supabase
      .from('mentee_requests')
      .select(`
        id, status, cycle_id, mentee_profile_id, mentor_profile_id,
        cycle:program_cycles!inner(
          id, program_id,
          program:programs!inner(org_id)
        )
      `)
      .eq('id', id)
      .single()

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const cycle = existingReq.cycle as unknown as { id: string; program_id: string; program: { org_id: string } }
    if (cycle.program.org_id !== access.orgId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { status, admin_notes, declined_reason } = parsed.data

    const updateData: Record<string, unknown> = {}

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    if (status === 'approved') {
      if (existingReq.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending requests can be approved' }, { status: 400 })
      }

      updateData.status = 'approved'
      updateData.approved_by = access.profileId
      updateData.approved_at = new Date().toISOString()

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          program_id: cycle.program_id,
          cycle_id: cycle.id,
          mentor_profile_id: existingReq.mentor_profile_id,
          mentee_profile_id: existingReq.mentee_profile_id,
          status: 'proposed',
          reasons: ['mentee_request'],
          approved_by: access.profileId,
          approved_at: new Date().toISOString()
        })
        .select()
        .single()

      if (matchError) {
        console.error('Error creating match:', matchError)
        return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
      }

      updateData.match_id = match.id
    } else if (status === 'declined') {
      if (!['pending', 'approved'].includes(existingReq.status)) {
        return NextResponse.json({ error: 'This request cannot be declined' }, { status: 400 })
      }

      updateData.status = 'declined'
      if (declined_reason) {
        updateData.declined_reason = declined_reason
      }
    }

    const { data: updated, error } = await supabase
      .from('mentee_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        mentee:profiles!mentee_requests_mentee_profile_id_fkey(
          id, display_name, avatar_url
        ),
        mentor:profiles!mentee_requests_mentor_profile_id_fkey(
          id, display_name, avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error updating request:', error)
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error in PATCH /api/counselor/requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
