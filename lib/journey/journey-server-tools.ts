import { tool } from 'ai'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import {
  buildRemainderOfYearHierarchy,
  getRemainingYearPlan,
} from '@/lib/goals/hierarchy'
import { YearPlanArtifactSchema } from '@/lib/goals/plan-artifact-schema'
import { collectDescendantIds, insertHierarchyTree } from '@/lib/goals/hierarchy-persistence'
import { getArtifactRoute, type JourneyArtifactKind } from '@/lib/journey/artifact-hooks'
import { assertGoalOwnedByProfile } from '@/lib/journey/goal-ownership'
import {
  draftOutreachTool,
  getMatchingSuggestionsTool,
  getUpcomingFocusesTool,
} from '@/lib/agent/journey-client-tools'
import { generateHandle, isValidHandle } from '@/lib/utils/slug'

const artifactSchema = z.enum(['goals', 'vision-board', 'profile', 'matching'])

export type JourneyClientAction =
  | { type: 'navigateToArtifact'; artifact: JourneyArtifactKind; href: string }
  | {
      type: 'openVisionBoard'
      visionBoardId?: string
      goalId?: string
      title?: string
    }
  | { type: 'refreshArtifacts'; reason: string }

export type JourneyServerToolsContext = {
  profileId: string
  now?: Date
}

async function isHandleAvailable(handle: string, profileId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('public_handle', handle)
    .neq('id', profileId)
    .maybeSingle()
  return !data
}

async function suggestHandle(profileId: string, displayName: string | null): Promise<string> {
  const base = generateHandle(displayName || 'mentor') || `user-${profileId.slice(0, 8)}`
  let candidate = base
  let counter = 0
  while (!(await isHandleAvailable(candidate, profileId)) && counter < 50) {
    counter++
    candidate = `${base}-${counter}`
  }
  return candidate
}

export function createJourneyServerTools(context: JourneyServerToolsContext) {
  const { profileId } = context
  const now = context.now ?? new Date()

  return {
    saveGoalDraft: tool({
      description:
        'Save a mentee goal as a draft in Mentorshape. Use after the user confirms title and optional description.',
      inputSchema: z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        motivation: z.string().max(2000).optional(),
      }),
      execute: async ({ title, description, motivation }) => {
        const supabase = createServiceClient()
        const { data, error } = await supabase
          .from('goals')
          .insert({
            profile_id: profileId,
            title,
            description: description ?? null,
            motivation: motivation ?? null,
            status: 'draft',
          })
          .select('id, title')
          .single()

        if (error || !data) {
          return { success: false, error: error?.message ?? 'Failed to save goal draft' }
        }

        return {
          success: true,
          goalId: data.id,
          title: data.title,
          status: 'draft',
          refreshArtifacts: true,
        }
      },
    }),

    navigateToArtifact: tool({
      description:
        'Navigate the user to a journey artifact panel (goals list, vision board, profile settings, or matching).',
      inputSchema: z.object({
        artifact: artifactSchema,
      }),
      execute: ({ artifact }) => {
        const href = getArtifactRoute(artifact)
        const clientAction: JourneyClientAction = {
          type: 'navigateToArtifact',
          artifact,
          href,
        }
        return { success: true, navigated: true, artifact, href, clientAction }
      },
    }),

    createGoalArtifact: tool({
      description:
        'Create a year plan goal artifact with hierarchy for the remainder of the calendar year.',
      inputSchema: z.object({
        primary_goal_title: z.string().min(1),
        success_definition: z.string().optional(),
        motivation: z.string().optional(),
        long_term_title: z.string().optional(),
        lock: z.boolean().optional(),
      }),
      execute: async (input) => {
        const plan = getRemainingYearPlan(now)
        const hierarchy =
          buildRemainderOfYearHierarchy({
            yearGoalTitle: input.primary_goal_title,
            longTermTitle: input.long_term_title,
            from: now,
          })

        const body = YearPlanArtifactSchema.parse({
          artifact_type: 'year_plan',
          version: 1,
          plan_year: plan.plan_year,
          as_of: now.toISOString(),
          primary_goal_title: input.primary_goal_title,
          success_definition: input.success_definition,
          motivation: input.motivation,
          hierarchy,
          locked: Boolean(input.lock),
          metadata: { source: 'journey-chat' },
        })

        const supabase = createServiceClient()
        const rootId = await insertHierarchyTree(supabase, profileId, body.hierarchy, null, {
          success_definition: body.success_definition,
          motivation: body.motivation,
          status: 'draft',
        })

        if (body.locked) {
          const ids = await collectDescendantIds(supabase, rootId)
          await supabase.from('goals').update({ is_locked: true }).in('id', ids)
        }

        return {
          success: true,
          root_goal_id: rootId,
          title: input.primary_goal_title,
          refreshArtifacts: true,
        }
      },
    }),

    lockGoal: tool({
      description: 'Lock a goal and its breakdown so the plan view is fixed.',
      inputSchema: z.object({
        goalId: z.string().min(1),
        locked: z.boolean().optional(),
      }),
      execute: async ({ goalId, locked }) => {
        try {
          await assertGoalOwnedByProfile(goalId, profileId)
        } catch {
          return { success: false, error: 'Goal not found or not owned by you' }
        }

        const supabase = createServiceClient()
        const ids = await collectDescendantIds(supabase, goalId)
        const { error } = await supabase
          .from('goals')
          .update({ is_locked: locked ?? true })
          .in('id', ids)

        if (error) {
          return { success: false, error: error.message }
        }

        return {
          success: true,
          data: { goal_id: goalId, locked: locked ?? true, affected_ids: ids },
          refreshArtifacts: true,
        }
      },
    }),

    openVisionBoard: tool({
      description: 'Open the vision board canvas in the journey sidebar.',
      inputSchema: z.object({
        visionBoardId: z.string().optional(),
        goalId: z.string().optional(),
        title: z.string().optional(),
      }),
      execute: async (input) => {
        if (input.goalId) {
          try {
            await assertGoalOwnedByProfile(input.goalId, profileId)
          } catch {
            return { success: false, error: 'Goal not found or not owned by you' }
          }
        }

        const clientAction: JourneyClientAction = {
          type: 'openVisionBoard',
          visionBoardId: input.visionBoardId,
          goalId: input.goalId,
          title: input.title,
        }

        return {
          success: true,
          event: 'mentorshape:open-vision-board',
          clientAction,
          refreshArtifacts: true,
        }
      },
    }),

    getYearPlanRemaining: tool({
      description: 'Return remaining months, quarters, and days in the current calendar year.',
      inputSchema: z.object({}),
      execute: async () => {
        return { success: true, plan: getRemainingYearPlan(now) }
      },
    }),

    getMatchingSuggestions: tool({
      description:
        'Load ranked mentor matches with scores and explainable breakdown for the current mentee.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).optional(),
        skills: z.array(z.string()).optional(),
      }),
      execute: async ({ limit, skills }) => {
        try {
          const data = await getMatchingSuggestionsTool({
            menteeProfileId: profileId,
            limit,
            skills,
          })
          return { success: true, data }
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : 'Failed to load matches',
          }
        }
      },
    }),

    draftOutreach: tool({
      description:
        'Generate LinkedIn and email outreach drafts (never sent without user confirmation).',
      inputSchema: z.object({
        mentorProfileId: z.string().min(1),
        goalId: z.string().optional(),
        sharedHighlights: z.array(z.string()).optional(),
        proposedFocusAt: z.string().optional(),
        durationMinutes: z.union([z.literal(30), z.literal(60)]).optional(),
      }),
      execute: async (input) => {
        if (input.goalId) {
          try {
            await assertGoalOwnedByProfile(input.goalId, profileId)
          } catch {
            return { success: false, error: 'Goal not found or not owned by you' }
          }
        }

        try {
          const data = await draftOutreachTool({
            menteeProfileId: profileId,
            mentorProfileId: input.mentorProfileId,
            goalId: input.goalId,
            sharedHighlights: input.sharedHighlights,
            proposedFocusAt: input.proposedFocusAt,
            durationMinutes: input.durationMinutes,
          })
          return { success: true, data }
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : 'Failed to draft outreach',
          }
        }
      },
    }),

    getUpcomingFocuses: tool({
      description: 'List upcoming focus sessions and in-app reminder banner text.',
      inputSchema: z.object({
        withinDays: z.number().int().min(1).max(90).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      execute: async ({ withinDays, limit }) => {
        try {
          const data = await getUpcomingFocusesTool({
            profileId,
            withinDays,
            limit,
          })
          return { success: true, data }
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : 'Failed to load reminders',
          }
        }
      },
    }),

    publishOneLinkProfile: tool({
      description: 'Publish or refresh the mentee public one-link profile at /m/[handle].',
      inputSchema: z.object({
        publicHandle: z.string().min(2).max(64).optional(),
      }),
      execute: async ({ publicHandle }) => {
        const supabase = createServiceClient()
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, public_handle')
          .eq('id', profileId)
          .single()

        if (!profile) {
          return { success: false, error: 'Profile not found' }
        }

        let handle = publicHandle?.trim().toLowerCase()
        if (!handle) {
          handle =
            profile.public_handle ?? (await suggestHandle(profileId, profile.display_name))
        }

        if (!handle) {
          return { success: false, error: 'Could not determine public handle' }
        }

        const validation = isValidHandle(handle)
        if (!validation.valid) {
          return { success: false, error: validation.error }
        }

        if (!(await isHandleAvailable(handle, profileId))) {
          return { success: false, error: 'This handle is already taken' }
        }

        const { data: updated, error } = await supabase
          .from('profiles')
          .update({ public_handle: handle })
          .eq('id', profileId)
          .select('id, public_handle, display_name')
          .single()

        if (error || !updated) {
          return { success: false, error: error?.message ?? 'Failed to publish profile' }
        }

        return {
          success: true,
          data: {
            profile: updated,
            public_url: `/m/${updated.public_handle}`,
          },
        }
      },
    }),
  }
}
