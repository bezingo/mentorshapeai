import {
  buildRemainderOfYearHierarchy,
  getRemainingYearPlan,
  type GoalHierarchyNode,
} from '@/lib/goals/hierarchy'
import { YearPlanArtifactSchema } from '@/lib/goals/plan-artifact-schema'

export const JOURNEY_CLIENT_TOOL_NAMES = [
  'createGoalArtifact',
  'lockGoal',
  'openVisionBoard',
  'getYearPlanRemaining',
] as const

export type JourneyClientToolName = (typeof JOURNEY_CLIENT_TOOL_NAMES)[number]

export type ClientToolResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }

export type CreateGoalArtifactInput = {
  primary_goal_title: string
  success_definition?: string
  motivation?: string
  long_term_title?: string
  hierarchy?: GoalHierarchyNode
  lock?: boolean
}

export async function createGoalArtifact(
  input: CreateGoalArtifactInput
): Promise<ClientToolResult<{ root_goal_id: string }>> {
  const from = new Date()
  const plan = getRemainingYearPlan(from)
  const hierarchy =
    input.hierarchy ??
    buildRemainderOfYearHierarchy({
      yearGoalTitle: input.primary_goal_title,
      longTermTitle: input.long_term_title,
      from,
    })

  const artifact = YearPlanArtifactSchema.parse({
    artifact_type: 'year_plan',
    version: 1,
    plan_year: plan.plan_year,
    as_of: from.toISOString(),
    primary_goal_title: input.primary_goal_title,
    success_definition: input.success_definition,
    motivation: input.motivation,
    hierarchy,
    locked: Boolean(input.lock),
    metadata: { source: 'agent' },
  })

  const res = await fetch('/api/goals/plan-artifact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(artifact),
  })

  const json = await res.json()
  if (!res.ok) {
    return { ok: false, error: json.error?.message ?? 'Failed to create goal artifact', code: json.error?.code }
  }

  return { ok: true, data: { root_goal_id: json.data.root_goal_id } }
}

export async function lockGoal(goalId: string, locked = true): Promise<ClientToolResult> {
  const res = await fetch(`/api/goals/${goalId}/lock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locked }),
  })
  const json = await res.json()
  if (!res.ok) {
    return { ok: false, error: json.error?.message ?? 'Failed to lock goal', code: json.error?.code }
  }
  return { ok: true, data: json.data }
}

export type OpenVisionBoardInput = {
  visionBoardId?: string
  goalId?: string
  title?: string
}

export function openVisionBoard(input: OpenVisionBoardInput = {}): ClientToolResult<{ event: string }> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'openVisionBoard must run in the browser' }
  }
  window.dispatchEvent(
    new CustomEvent('mentorshape:open-vision-board', {
      detail: input,
    })
  )
  return { ok: true, data: { event: 'mentorshape:open-vision-board' } }
}

export function getYearPlanRemaining(from: Date = new Date()): ClientToolResult {
  return { ok: true, data: getRemainingYearPlan(from) }
}

/** Tool definitions for @heroui/agent wiring (parallel PR). */
export const journeyClientToolDefinitions = {
  createGoalArtifact: {
    description: 'Create a year plan goal artifact with hierarchy for the remainder of the calendar year.',
    parameters: {
      type: 'object',
      properties: {
        primary_goal_title: { type: 'string' },
        success_definition: { type: 'string' },
        motivation: { type: 'string' },
        long_term_title: { type: 'string' },
        lock: { type: 'boolean' },
      },
      required: ['primary_goal_title'],
    },
    handler: createGoalArtifact,
  },
  lockGoal: {
    description: 'Lock a goal and its breakdown so the plan view is fixed.',
    parameters: {
      type: 'object',
      properties: {
        goalId: { type: 'string' },
        locked: { type: 'boolean' },
      },
      required: ['goalId'],
    },
    handler: ({ goalId, locked }: { goalId: string; locked?: boolean }) => lockGoal(goalId, locked ?? true),
  },
  openVisionBoard: {
    description: 'Open the vision board canvas in the journey sidebar.',
    parameters: {
      type: 'object',
      properties: {
        visionBoardId: { type: 'string' },
        goalId: { type: 'string' },
        title: { type: 'string' },
      },
    },
    handler: openVisionBoard,
  },
  getYearPlanRemaining: {
    description: 'Return remaining months, quarters, and days in the current calendar year.',
    parameters: { type: 'object', properties: {} },
    handler: () => getYearPlanRemaining(),
  },
} as const
