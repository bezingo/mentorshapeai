import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMentee, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { CreateHierarchyPayloadSchema } from '@/lib/goals/hierarchy'
import {
  buildHierarchyTree,
  collectDescendantIds,
  deleteGoalDescendants,
  insertHierarchyTree,
  isGoalOrAncestorLocked,
  type GoalRow,
} from '@/lib/goals/hierarchy-persistence'

const CreateFromArtifactSchema = z.object({
  hierarchy: CreateHierarchyPayloadSchema.shape.root,
  success_definition: z.string().optional(),
  motivation: z.string().optional(),
  status: z.enum(['draft', 'active']).default('draft'),
  replace_existing: z.boolean().default(true),
})

export async function GET(
  _request: NextRequest,
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
    const supabase = createServiceClient()

    const { data: root, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .eq('profile_id', profile.id)
      .single()

    if (error || !root) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    const descendantIds = await collectDescendantIds(supabase, id)
    const { data: rows } = await supabase.from('goals').select('*').in('id', descendantIds)

    const tree = buildHierarchyTree((rows ?? []) as GoalRow[], id)

    return NextResponse.json({
      data: {
        root: root,
        hierarchy: tree,
        is_locked: root.is_locked,
      },
    })
  } catch (error) {
    console.error('GET hierarchy error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load hierarchy' } },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const body = await request.json()
    const validated = CreateFromArtifactSchema.parse(body)
    const supabase = createServiceClient()

    const { data: existing } = await supabase
      .from('goals')
      .select('id, profile_id, is_locked')
      .eq('id', id)
      .single()

    if (!existing || existing.profile_id !== profile.id) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    if (await isGoalOrAncestorLocked(supabase, id)) {
      return NextResponse.json(
        { error: { code: 'GOAL_LOCKED', message: 'Goal is locked and cannot be modified' } },
        { status: 423 }
      )
    }

    if (validated.replace_existing) {
      await deleteGoalDescendants(supabase, id)
      await supabase
        .from('goals')
        .update({
          title: validated.hierarchy.title,
          description: validated.hierarchy.description ?? null,
          hierarchy_level: validated.hierarchy.hierarchy_level,
          plan_year: validated.hierarchy.plan_year ?? null,
          period_key: validated.hierarchy.period_key ?? null,
          success_definition: validated.success_definition ?? null,
          motivation: validated.motivation ?? null,
          status: validated.status,
        })
        .eq('id', id)

      for (const child of validated.hierarchy.children ?? []) {
        await insertHierarchyTree(supabase, profile.id, child, id)
      }

      const tree = buildHierarchyTree(
        (await supabase.from('goals').select('*').in('id', await collectDescendantIds(supabase, id)))
          .data as GoalRow[],
        id
      )

      return NextResponse.json({ data: { root_goal_id: id, hierarchy: tree } })
    }

    return NextResponse.json(
      { error: { code: 'REPLACE_REQUIRED', message: 'Set replace_existing to update this goal hierarchy' } },
      { status: 400 }
    )
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.errors[0].message } },
        { status: 400 }
      )
    }
    console.error('POST hierarchy error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to save hierarchy' } },
      { status: 500 }
    )
  }
}
