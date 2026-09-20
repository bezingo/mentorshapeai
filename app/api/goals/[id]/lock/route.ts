import { NextRequest, NextResponse } from 'next/server'
import { requireMentee, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { collectDescendantIds } from '@/lib/goals/hierarchy-persistence'
import { z } from 'zod'

const LockSchema = z.object({
  locked: z.boolean().default(true),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const { id } = await params
    const body = LockSchema.parse(await request.json().catch(() => ({})))
    const supabase = createServiceClient()

    const { data: goal } = await supabase
      .from('goals')
      .select('id, profile_id')
      .eq('id', id)
      .single()

    if (!goal || goal.profile_id !== profile.id) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    const ids = await collectDescendantIds(supabase, id)
    const { error } = await supabase
      .from('goals')
      .update({ is_locked: body.locked })
      .in('id', ids)

    if (error) {
      return NextResponse.json(
        { error: { code: 'LOCK_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { goal_id: id, locked: body.locked, affected_ids: ids } })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.errors[0].message } },
        { status: 400 }
      )
    }
    console.error('Lock goal error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to lock goal' } },
      { status: 500 }
    )
  }
}
