import { createServiceClient } from '@/lib/supabase/service'

export interface UpcomingFocusReminder {
  focus_id: string
  collaboration_id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  mentor_profile_id: string
  mentee_profile_id: string
  role: 'mentor' | 'mentee'
  banner_message: string
}

export interface UpcomingCollaborationReminder {
  collaboration_id: string
  status: string
  updated_at: string | null
  banner_message: string
}

export interface UpcomingRemindersResult {
  focuses: UpcomingFocusReminder[]
  collaborations: UpcomingCollaborationReminder[]
  /** In-app banner copy for the next item, if any */
  banner: string | null
}

export async function getUpcomingRemindersForProfile(
  profileId: string,
  options?: { withinDays?: number; focusLimit?: number }
): Promise<UpcomingRemindersResult> {
  const withinDays = options?.withinDays ?? 14
  const focusLimit = options?.focusLimit ?? 20
  const supabase = createServiceClient()
  const now = new Date()
  const until = new Date(now)
  until.setDate(until.getDate() + withinDays)

  const { data: collabs } = await supabase
    .from('collaborations')
    .select('id, status, mentor_profile_id, mentee_profile_id, updated_at')
    .or(`mentor_profile_id.eq.${profileId},mentee_profile_id.eq.${profileId}`)
    .in('status', ['pending', 'accepted', 'active'])

  const collaborationIds = (collabs ?? []).map((c) => c.id)
  if (collaborationIds.length === 0) {
    return { focuses: [], collaborations: [], banner: null }
  }

  const { data: focuses } = await supabase
    .from('focuses')
    .select('id, collaboration_id, scheduled_at, duration_minutes, status')
    .in('collaboration_id', collaborationIds)
    .eq('status', 'scheduled')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', until.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(focusLimit)

  const collabById = new Map((collabs ?? []).map((c) => [c.id, c]))

  const focusReminders: UpcomingFocusReminder[] = (focuses ?? []).map((focus) => {
    const collab = collabById.get(focus.collaboration_id)!
    const role = collab.mentor_profile_id === profileId ? 'mentor' : 'mentee'
    const when = new Date(focus.scheduled_at).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    return {
      focus_id: focus.id,
      collaboration_id: focus.collaboration_id,
      scheduled_at: focus.scheduled_at,
      duration_minutes: focus.duration_minutes,
      status: focus.status,
      mentor_profile_id: collab.mentor_profile_id,
      mentee_profile_id: collab.mentee_profile_id,
      role,
      banner_message: `Upcoming focus (${role}) on ${when}`,
    }
  })

  const collaborationReminders: UpcomingCollaborationReminder[] = (collabs ?? [])
    .filter((c) => c.status === 'pending')
    .map((c) => ({
      collaboration_id: c.id,
      status: c.status,
      updated_at: c.updated_at,
      banner_message: 'You have a pending collaboration request to review',
    }))

  const banner =
    focusReminders[0]?.banner_message ??
    collaborationReminders[0]?.banner_message ??
    null

  return {
    focuses: focusReminders,
    collaborations: collaborationReminders,
    banner,
  }
}
