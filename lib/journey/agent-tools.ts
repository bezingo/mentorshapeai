import { createToolHelper } from '@heroui/agent'
import { z } from '@heroui/agent/zod'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { getArtifactRoute, type JourneyArtifactKind } from '@/lib/journey/artifact-hooks'

export type JourneyAgentContext = {
  router: AppRouterInstance
  onGoalSaved?: (goal: { id: string; title: string }) => void
}

const tool = createToolHelper<JourneyAgentContext>()

const artifactSchema = z.enum(['goals', 'vision-board', 'profile', 'matching'])

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
        'Navigate the user to a journey artifact panel (goals list, vision board stub, profile settings, or matching stub).',
      icon: 'view',
      parameters: z.object({
        artifact: artifactSchema,
      }),
      execute: ({ artifact }, { router }) => {
        const href = getArtifactRoute(artifact as JourneyArtifactKind)
        router.push(href)
        return {
          navigated: true,
          artifact,
          href,
          note:
            artifact === 'vision-board' || artifact === 'matching'
              ? 'This area is a stub until the next release.'
              : undefined,
        }
      },
    }),
  ]
}
