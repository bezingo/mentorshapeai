/**
 * Client-callable helpers for the onboarding / journey agent.
 * These wrap server libs and API contracts without auto-sending outreach.
 */

import { getMatchingSuggestions } from '@/lib/matching/suggestions'
import { getUpcomingRemindersForProfile } from '@/lib/reminders/upcoming'
import { buildOutreachDrafts } from '@/lib/outreach/templates'
import { buildScheduleFocusHook } from '@/lib/outreach/schedule-focus'
import { createServiceClient } from '@/lib/supabase/service'

export async function getMatchingSuggestionsTool(input: {
  menteeProfileId: string
  limit?: number
  skills?: string[]
}) {
  return getMatchingSuggestions({
    menteeProfileId: input.menteeProfileId,
    limit: input.limit,
    skillsFilter: input.skills,
  })
}

export async function draftOutreachTool(input: {
  menteeProfileId: string
  mentorProfileId: string
  goalId?: string
  sharedHighlights?: string[]
  proposedFocusAt?: string
  durationMinutes?: 30 | 60
}) {
  const supabase = createServiceClient()

  const [{ data: mentee }, { data: mentor }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, public_handle')
      .eq('id', input.menteeProfileId)
      .single(),
    supabase
      .from('profiles')
      .select('id, display_name, headline, is_mentor')
      .eq('id', input.mentorProfileId)
      .single(),
  ])

  if (!mentee || !mentor?.is_mentor) {
    throw new Error('Invalid mentee or mentor profile')
  }

  let goalTitle: string | null = null
  if (input.goalId) {
    const { data: goal } = await supabase
      .from('goals')
      .select('title, profile_id')
      .eq('id', input.goalId)
      .single()
    if (goal && goal.profile_id === mentee.id) {
      goalTitle = goal.title
    }
  }

  const drafts = buildOutreachDrafts({
    menteeName: mentee.display_name || 'A Mentorshape member',
    mentorName: mentor.display_name || 'there',
    mentorHeadline: mentor.headline,
    sharedHighlights: input.sharedHighlights,
    goalTitle,
    publicProfileUrl: mentee.public_handle ? `/m/${mentee.public_handle}` : null,
  })

  const { data: collab } = await supabase
    .from('collaborations')
    .select('id')
    .eq('mentee_profile_id', mentee.id)
    .eq('mentor_profile_id', mentor.id)
    .in('status', ['pending', 'accepted', 'active'])
    .maybeSingle()

  const schedule_focus = input.proposedFocusAt
    ? buildScheduleFocusHook({
        collaborationId: collab?.id ?? null,
        scheduledAtIso: input.proposedFocusAt,
        durationMinutes: input.durationMinutes,
      })
    : null

  return {
    drafts,
    requires_user_confirmation: true,
    schedule_focus,
  }
}

export async function getUpcomingFocusesTool(input: {
  profileId: string
  withinDays?: number
  limit?: number
}) {
  const reminders = await getUpcomingRemindersForProfile(input.profileId, {
    withinDays: input.withinDays,
    focusLimit: input.limit,
  })
  return {
    focuses: reminders.focuses,
    collaborations: reminders.collaborations,
    banner: reminders.banner,
  }
}

/** Tool definitions for HeroUI / AI SDK registration */
export const journeyAgentToolDefinitions = {
  getMatchingSuggestions: {
    description:
      'Load ranked mentor matches with scores and explainable breakdown for the current mentee.',
    parameters: {
      limit: { type: 'number', optional: true },
      skills: { type: 'array', items: { type: 'string' }, optional: true },
    },
  },
  draftOutreach: {
    description:
      'Generate LinkedIn and email outreach drafts (never sent without user confirmation).',
    parameters: {
      mentorProfileId: { type: 'string' },
      goalId: { type: 'string', optional: true },
      sharedHighlights: { type: 'array', items: { type: 'string' }, optional: true },
      proposedFocusAt: { type: 'string', optional: true },
    },
  },
  getUpcomingFocuses: {
    description: 'List upcoming focus sessions and in-app reminder banner text.',
    parameters: {
      withinDays: { type: 'number', optional: true },
    },
  },
} as const
