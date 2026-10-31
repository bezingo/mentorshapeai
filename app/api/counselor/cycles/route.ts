import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrgAdminAccess } from '@/lib/auth/org-access'
import { getSession } from '@/lib/auth-helpers'
import { z } from 'zod'

const CreateCycleSchema = z.object({
  program_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
  request_deadline: z.string().optional().nullable(),
  max_requests_per_mentee: z.number().int().min(1).max(10).optional(),
  status: z.enum(['draft', 'open', 'matching', 'active', 'completed']).optional(),
})

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('program_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('program_cycles')
      .select(`
        *,
        program:programs!inner(id, name, org_id)
      `)
      .eq('program.org_id', access.orgId)
      .order('start_date', { ascending: false })

    if (programId) {
      query = query.eq('program_id', programId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: cycles, error } = await query

    if (error) {
      console.error('Error fetching cycles:', error)
      return NextResponse.json({ error: 'Failed to fetch cycles' }, { status: 500 })
    }

    return NextResponse.json({ data: cycles })
  } catch (error) {
    console.error('Error in GET /api/counselor/cycles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const parsed = CreateCycleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.errors
      }, { status: 400 })
    }

    const { program_id, ...cycleData } = parsed.data

    const { data: program } = await supabase
      .from('programs')
      .select('id, org_id')
      .eq('id', program_id)
      .eq('org_id', access.orgId)
      .single()

    if (!program) {
      return NextResponse.json({ error: 'Program not found or access denied' }, { status: 404 })
    }

    const { data: cycle, error } = await supabase
      .from('program_cycles')
      .insert({
        program_id,
        ...cycleData,
        status: cycleData.status || 'draft'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating cycle:', error)
      return NextResponse.json({ error: 'Failed to create cycle' }, { status: 500 })
    }

    return NextResponse.json({ data: cycle }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/counselor/cycles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
