import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoalHierarchyNode } from './hierarchy'

export type GoalRow = {
  id: string
  profile_id: string
  parent_goal_id: string | null
  title: string
  description: string | null
  hierarchy_level: string | null
  plan_year: number | null
  period_key: string | null
  is_locked: boolean
  sort_order: number
  status: string
}

export async function isGoalOrAncestorLocked(
  supabase: SupabaseClient,
  goalId: string
): Promise<boolean> {
  let currentId: string | null = goalId
  const visited = new Set<string>()

  while (currentId) {
    if (visited.has(currentId)) break
    visited.add(currentId)

    const { data: row, error } = await supabase
      .from('goals')
      .select('id, parent_goal_id, is_locked')
      .eq('id', currentId)
      .single()

    if (error || !row) return false
    if (row.is_locked) return true
    currentId = row.parent_goal_id as string | null
  }

  return false
}

export async function deleteGoalDescendants(
  supabase: SupabaseClient,
  rootGoalId: string
): Promise<void> {
  const { data: children } = await supabase
    .from('goals')
    .select('id')
    .eq('parent_goal_id', rootGoalId)

  for (const child of children ?? []) {
    await deleteGoalDescendants(supabase, child.id)
    await supabase.from('goals').delete().eq('id', child.id)
  }
}

export async function insertHierarchyTree(
  supabase: SupabaseClient,
  profileId: string,
  node: GoalHierarchyNode,
  parentGoalId: string | null,
  rootFields?: {
    success_definition?: string
    motivation?: string
    status?: 'draft' | 'active'
  }
): Promise<string> {
  const isRoot = parentGoalId === null
  const { data: inserted, error } = await supabase
    .from('goals')
    .insert({
      profile_id: profileId,
      parent_goal_id: parentGoalId,
      title: node.title,
      description: node.description ?? null,
      hierarchy_level: node.hierarchy_level,
      plan_year: node.plan_year ?? null,
      period_key: node.period_key ?? null,
      sort_order: node.sort_order ?? 0,
      status: isRoot ? (rootFields?.status ?? 'draft') : 'draft',
      success_definition: isRoot ? rootFields?.success_definition ?? null : null,
      motivation: isRoot ? rootFields?.motivation ?? null : null,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(error?.message ?? 'Failed to insert hierarchy node')
  }

  const goalId = inserted.id as string
  for (const child of node.children ?? []) {
    await insertHierarchyTree(supabase, profileId, child, goalId)
  }

  return goalId
}

export function buildHierarchyTree(rows: GoalRow[], rootId: string): GoalHierarchyNode | null {
  const byParent = new Map<string | null, GoalRow[]>()
  for (const row of rows) {
    const key = row.parent_goal_id
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(row)
  }

  function build(nodeId: string): GoalHierarchyNode | null {
    const row = rows.find((r) => r.id === nodeId)
    if (!row) return null
    const children = (byParent.get(nodeId) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => build(c.id))
      .filter(Boolean) as GoalHierarchyNode[]

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      hierarchy_level: row.hierarchy_level as GoalHierarchyNode['hierarchy_level'],
      plan_year: row.plan_year,
      period_key: row.period_key,
      sort_order: row.sort_order,
      children,
    }
  }

  return build(rootId)
}

export async function collectDescendantIds(
  supabase: SupabaseClient,
  rootId: string
): Promise<string[]> {
  const ids: string[] = [rootId]
  const { data: children } = await supabase
    .from('goals')
    .select('id')
    .eq('parent_goal_id', rootId)

  for (const child of children ?? []) {
    ids.push(...(await collectDescendantIds(supabase, child.id)))
  }
  return ids
}
