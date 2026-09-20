import { createToolHelper } from '@heroui/agent'
import { z } from '@heroui/agent/zod'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import {
  createGoalArtifact,
  getYearPlanRemaining,
  lockGoal,
  openVisionBoard,
} from '@/lib/agent/client-tools'
import { getArtifactRoute, type JourneyArtifactKind } from '@/lib/journey/artifact-hooks'

export type JourneyAgentContext = {
  router: AppRouterInstance
  onGoalSaved?: (goal: { id: string; title: string }) => void
}

const tool = createToolHelper<JourneyAgentContext>()

const artifactSchema = z.enum(['goals', 'vision-board', 'profile', 'matching'])

/**
 * Single registry for HeroUI Agent client tools used on `/journey`.
 * Combines onboarding goal/artifact tools (`client-tools`) with matching/outreach/reminder APIs.
 */
export function createJourneyAgentTools() {
  return [
    tool({
      name: 'saveGoalDraft',
      description:
        'Save a mentee goal as a draft in Mentorshape. Use after the user confirms title and optional description.',
      icon: 'edit',
      parameters: z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        motivation: z.string().max(2000).optional(),
      }),
      execute: async ({ title, description, motivation }, { onGoalSaved }) => {
        const response = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            motivation,
            status: 'draft',
          }),
        })

        const payload = (await response.json()) as {
          data?: { id: string; title: string }
          error?: { message?: string }
        }

        if (!response.ok) {
          return {
            success: false,
            error: payload.error?.message ?? 'Failed to save goal draft',
          }
        }

        const goal = payload.data
        if (goal) {
          onGoalSaved?.(goal)
        }

        return {
          success: true,
          goalId: goal?.id,
          title: goal?.title ?? title,
          status: 'draft',
        }
      },
    }),
    tool({
      name: 'navigateToArtifact',
      description:
        'Navigate the user to a journey artifact panel (goals list, vision board, profile settings, or matching).',
      icon: 'view',
      parameters: z.object({
        artifact: artifactSchema,
      }),
      execute: ({ artifact }, { router }) => {
        const href = getArtifactRoute(artifact as JourneyArtifactKind)
        router.push(href)
        return { navigated: true, artifact, href }
      },
    }),
    tool({
      name: 'createGoalArtifact',
      description:
        'Create a year plan goal artifact with hierarchy for the remainder of the calendar year.',
      icon: 'edit',
      parameters: z.object({
        primary_goal_title: z.string().min(1),
        success_definition: z.string().optional(),
        motivation: z.string().optional(),
        long_term_title: z.string().optional(),
        lock: z.boolean().optional(),
      }),
      execute: async (input, { onGoalSaved }) => {
        const result = await createGoalArtifact(input)
        if (!result.ok) {
          return { success: false, error: result.error }
        }
        onGoalSaved?.({ id: result.data.root_goal_id, title: input.primary_goal_title })
        return { success: true, root_goal_id: result.data.root_goal_id }
      },
    }),
    tool({
      name: 'lockGoal',
      description: 'Lock a goal and its breakdown so the plan view is fixed.',
      icon: 'lock',
      parameters: z.object({
        goalId: z.string().min(1),
        locked: z.boolean().optional(),
      }),
      execute: async ({ goalId, locked }) => {
        const result = await lockGoal(goalId, locked ?? true)
        if (!result.ok) {
          return { success: false, error: result.error }
        }
        return { success: true, data: result.data }
      },
    }),
    tool({
      name: 'openVisionBoard',
      description: 'Open the vision board canvas in the journey sidebar.',
      icon: 'view',
      parameters: z.object({
        visionBoardId: z.string().optional(),
        goalId: z.string().optional(),
        title: z.string().optional(),
      }),
      execute: (input) => {
        const result = openVisionBoard(input)
        if (!result.ok) {
          return { success: false, error: result.error }
        }
        return { success: true, event: result.data.event }
      },
    }),
    tool({
      name: 'getYearPlanRemaining',
      description: 'Return remaining months, quarters, and days in the current calendar year.',
      icon: 'calendar',
      parameters: z.object({}),
      execute: () => {
        const result = getYearPlanRemaining()
        return result.ok ? { success: true, plan: result.data } : { success: false, error: result.error }
      },
    }),
    tool({
      name: 'getMatchingSuggestions',
      description:
        'Load ranked mentor matches with scores and explainable breakdown for the current mentee.',
      icon: 'users',
      parameters: z.object({
        limit: z.number().int().min(1).max(50).optional(),
        skills: z.array(z.string()).optional(),
      }),
      execute: async ({ limit, skills }) => {
        const params = new URLSearchParams()
        if (limit != null) params.set('limit', String(limit))
        if (skills?.length) params.set('skills', skills.join(','))
        const response = await fetch(`/api/matching/suggestions?${params}`)
        const json = await response.json()
        if (!response.ok) {
          return { success: false, error: json.error?.message ?? 'Failed to load matches' }
        }
        return { success: true, data: json.data }
      },
    }),
    tool({
      name: 'draftOutreach',
      description:
        'Generate LinkedIn and email outreach drafts (never sent without user confirmation).',
      icon: 'mail',
      parameters: z.object({
        mentorProfileId: z.string().min(1),
        goalId: z.string().optional(),
        sharedHighlights: z.array(z.string()).optional(),
        proposedFocusAt: z.string().optional(),
        durationMinutes: z.union([z.literal(30), z.literal(60)]).optional(),
      }),
      execute: async (input) => {
        const response = await fetch('/api/outreach/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const json = await response.json()
        if (!response.ok) {
          return { success: false, error: json.error?.message ?? 'Failed to draft outreach' }
        }
        return { success: true, data: json.data }
      },
    }),
    tool({
      name: 'getUpcomingFocuses',
      description: 'List upcoming focus sessions and in-app reminder banner text.',
      icon: 'calendar',
      parameters: z.object({
        withinDays: z.number().int().min(1).max(90).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      execute: async ({ withinDays, limit }) => {
        const params = new URLSearchParams()
        if (withinDays != null) params.set('withinDays', String(withinDays))
        if (limit != null) params.set('limit', String(limit))
        const response = await fetch(`/api/reminders/upcoming?${params}`)
        const json = await response.json()
        if (!response.ok) {
          return { success: false, error: json.error?.message ?? 'Failed to load reminders' }
        }
        return { success: true, data: json.data }
      },
    }),
    tool({
      name: 'publishOneLinkProfile',
      description: 'Publish or refresh the mentee public one-link profile at /m/[handle].',
      icon: 'link',
      parameters: z.object({
        publicHandle: z.string().min(2).max(64).optional(),
      }),
      execute: async ({ publicHandle }) => {
        const response = await fetch('/api/profile/publish-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_handle: publicHandle }),
        })
        const json = await response.json()
        if (!response.ok) {
          return { success: false, error: json.error?.message ?? 'Failed to publish profile' }
        }
        return { success: true, data: json.data }
      },
    }),
  ]
}
