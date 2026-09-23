import { z } from 'zod'
import { GOAL_HIERARCHY_LEVELS, GoalHierarchyNodeSchema } from './hierarchy'

/**
 * Agent-oriented JSON schema for year plan artifacts produced during onboarding.
 */
export const YearPlanArtifactSchema = z.object({
  artifact_type: z.literal('year_plan'),
  version: z.literal(1),
  plan_year: z.number().int(),
  as_of: z.string().datetime(),
  primary_goal_title: z.string().min(1).max(200),
  success_definition: z.string().max(2000).optional(),
  motivation: z.string().max(2000).optional(),
  hierarchy: GoalHierarchyNodeSchema,
  locked: z.boolean().default(false),
  metadata: z
    .object({
      source: z.enum(['agent', 'user', 'import']).default('agent'),
      advisor_session_id: z.string().optional(),
    })
    .optional(),
})

export type YearPlanArtifact = z.infer<typeof YearPlanArtifactSchema>

export const VisionBoardArtifactSchema = z.object({
  artifact_type: z.literal('vision_board'),
  version: z.literal(1),
  vision_board_id: z.string().uuid().optional(),
  goal_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(120).default('Vision board'),
  graph_json: z.record(z.unknown()).default({}),
})

export type VisionBoardArtifact = z.infer<typeof VisionBoardArtifactSchema>

export const OnboardingGoalArtifactSchema = z.discriminatedUnion('artifact_type', [
  YearPlanArtifactSchema,
  VisionBoardArtifactSchema,
])

export type OnboardingGoalArtifact = z.infer<typeof OnboardingGoalArtifactSchema>

/** JSON Schema export for agent tool definitions */
export const yearPlanArtifactJsonSchema = {
  type: 'object',
  required: ['artifact_type', 'version', 'plan_year', 'as_of', 'primary_goal_title', 'hierarchy'],
  properties: {
    artifact_type: { const: 'year_plan' },
    version: { const: 1 },
    plan_year: { type: 'integer' },
    as_of: { type: 'string', format: 'date-time' },
    primary_goal_title: { type: 'string', maxLength: 200 },
    success_definition: { type: 'string' },
    motivation: { type: 'string' },
    locked: { type: 'boolean' },
    hierarchy: {
      type: 'object',
      required: ['title', 'hierarchy_level'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        hierarchy_level: { enum: [...GOAL_HIERARCHY_LEVELS] },
        plan_year: { type: 'integer' },
        period_key: { type: 'string' },
        children: { type: 'array', items: { type: 'object' } },
      },
    },
  },
} as const
