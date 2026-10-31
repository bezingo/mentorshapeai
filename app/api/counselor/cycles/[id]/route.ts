import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrgAdminAccess } from '@/lib/auth/org-access'
import { getSession } from '@/lib/auth-helpers'
import { z } from 'zod'

const UpdateCycleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  name_ar: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  description_ar: z.string().optional().nullable(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  request_deadline: z.string().optional().nullable(),
  max_requests_per_mentee: z.number().int().min(1).max(10).optional(),
  status: z.enum(['draft', 'open', 'matching', 'active', 'completed']).optional(),
  settings: z.record(z.unknown()).optional(),
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

    const { id } = await params
    const supabase = createServiceClient()
    const access = await getOrgAdminAccess(supabase, session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { data: cycle, error } = await supabase
      .from('program_cycles')
      .select(`
        *,
        program:programs!inner(id, name, org_id)
      `)
      .eq('id', id)
      .eq('program.org_id', access.orgId)
      .single()

    if (error || !cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    const { data: stats } = await supabase
      .rpc('get_cycle_request_stats', { p_cycle_id: id })

    return NextResponse.json({
      data: {
        ...cycle,
        stats: stats?.[0] || null
      }
    })
  } catch (error) {
    console.error('Error in GET /api/counselor/cycles/[id]:', error)
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

    const { id } = await params
    const supabase = createServiceClient()
    const access = await getOrgAdminAccess(supabase, session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = UpdateCycleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.errors
      }, { status: 400 })
    }

    const { data: existingCycle } = await supabase
      .from('program_cycles')
      .select('id, program:programs!inner(org_id)')
      .eq('id', id)
      .single()

    if (!existingCycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    const cycleProgram = existingCycle.program as unknown as { org_id: string }
    if (cycleProgram.org_id !== access.orgId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: cycle, error } = await supabase
      .from('program_cycles')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating cycle:', error)
      return NextResponse.json({ error: 'Failed to update cycle' }, { status: 500 })
    }

    return NextResponse.json({ data: cycle })
  } catch (error) {
    console.error('Error in PATCH /api/counselor/cycles/[id]:', error)
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

    const { id } = await params
    const supabase = createServiceClient()
    const access = await getOrgAdminAccess(supabase, session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { data: existingCycle } = await supabase
      .from('program_cycles')
      .select('id, status, program:programs!inner(org_id)')
      .eq('id', id)
      .single()

    if (!existingCycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    const deleteCycleProgram = existingCycle.program as unknown as { org_id: string }
    if (deleteCycleProgram.org_id !== access.orgId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (existingCycle.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft cycles can be deleted' }, { status: 400 })
    }

    const { error } = await supabase
      .from('program_cycles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting cycle:', error)
      return NextResponse.json({ error: 'Failed to delete cycle' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/counselor/cycles/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
