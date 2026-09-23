import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMentee, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { YearPlanArtifactSchema } from '@/lib/goals/plan-artifact-schema'
import { insertHierarchyTree, buildHierarchyTree, collectDescendantIds, type GoalRow } from '@/lib/goals/hierarchy-persistence'

export async function POST(request: NextRequest) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = YearPlanArtifactSchema.parse(await request.json())
    const supabase = createServiceClient()

    const rootId = await insertHierarchyTree(
      supabase,
      profile.id,
      body.hierarchy,
      null,
      {
        success_definition: body.success_definition,
        motivation: body.motivation,
        status: 'draft',
      }
    )

    if (body.locked) {
      const ids = await collectDescendantIds(supabase, rootId)
      await supabase.from('goals').update({ is_locked: true }).in('id', ids)
    }

    const rows = (await supabase
      .from('goals')
      .select('*')
      .in('id', await collectDescendantIds(supabase, rootId))).data as GoalRow[]

    const tree = buildHierarchyTree(rows, rootId)

    return NextResponse.json(
      {
        data: {
          artifact: body,
          root_goal_id: rootId,
          hierarchy: tree,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.errors[0].message, details: error.errors } },
        { status: 400 }
      )
    }
    console.error('Create plan artifact error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create plan artifact' } },
      { status: 500 }
    )
  }
}
