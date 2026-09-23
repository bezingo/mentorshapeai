import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { CreateProgramSchema } from '@/lib/validations/organization'
import { requireOrgAdmin, requireOrgMember } from '@/lib/org/access'

type RouteContext = { params: Promise<{ orgId: string }> }

/**
 * GET /api/organizations/[orgId]/programs
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { orgId } = await context.params
    const supabase = createServiceClient()

    const membership = await requireOrgMember(supabase, orgId, profile.id)
    if (!membership) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not a member of this organization' } },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('org_id', orgId)
      .order('start_date', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('List programs error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to list programs' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    console.error('GET programs:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations/[orgId]/programs — org admin only
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { orgId } = await context.params
    const supabase = createServiceClient()

    const admin = await requireOrgAdmin(supabase, orgId, profile.id)
    if (!admin) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Organization admin required' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = CreateProgramSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message ?? 'Invalid request',
            details: parsed.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('programs')
      .insert({
        org_id: orgId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        start_date: parsed.data.start_date ?? null,
        end_date: parsed.data.end_date ?? null,
        settings: parsed.data.settings ?? null,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Create program error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to create program' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    console.error('POST programs:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
