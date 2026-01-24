import { createServiceClient } from '@/lib/supabase/service'

/**
 * Badge types that can be awarded to mentors
 */
export type BadgeType =
  | 'first_completion'
  | 'five_completions'
  | 'ten_completions'
  | 'highly_rated'
  | 'consistent_mentor'
  | 'quick_responder'
  | 'milestone_achiever'

/**
 * Badge metadata structure
 */
export interface BadgeMetadata {
  completionId?: string
  goalId?: string
  menteeId?: string
  rating?: number
  totalCompletions?: number
  awardedFor?: string
}

/**
 * Badge information with label and description
 */
export interface BadgeInfo {
  type: BadgeType
  label: string
  description: string
  icon: string
}

/**
 * Badge definitions with their details
 */
export const BADGE_DEFINITIONS: Record<BadgeType, Omit<BadgeInfo, 'type'>> = {
  first_completion: {
    label: 'First Goal Completed',
    description: 'Successfully helped a mentee complete their first goal',
    icon: '🎯',
  },
  five_completions: {
    label: '5 Goals Completed',
    description: 'Helped 5 mentees achieve their goals',
    icon: '⭐',
  },
  ten_completions: {
    label: '10 Goals Completed',
    description: 'Helped 10 mentees achieve their goals',
    icon: '🏆',
  },
  highly_rated: {
    label: 'Highly Rated Mentor',
    description: 'Consistently received 5-star ratings from mentees',
    icon: '💫',
  },
  consistent_mentor: {
    label: 'Consistent Mentor',
    description: 'Maintained regular engagement throughout collaborations',
    icon: '📅',
  },
  quick_responder: {
    label: 'Quick Responder',
    description: 'Known for fast response times to mentee requests',
    icon: '⚡',
  },
  milestone_achiever: {
    label: 'Milestone Achiever',
    description: 'Helped mentees complete 100+ milestones',
    icon: '🎖️',
  },
}

/**
 * Get badge info for a given type
 */
export function getBadgeInfo(type: BadgeType): BadgeInfo {
  const definition = BADGE_DEFINITIONS[type]
  return {
    type,
    ...definition,
  }
}

/**
 * Award a badge to a mentor
 *
 * @param mentorProfileId - The profile ID of the mentor to award
 * @param badgeType - The type of badge to award
 * @param collaborationId - Optional collaboration ID this badge is for
 * @param metadata - Optional additional metadata
 * @returns The badge ID if created, null if badge already exists
 */
export async function awardBadge(
  mentorProfileId: string,
  badgeType: BadgeType,
  collaborationId?: string,
  metadata?: BadgeMetadata
): Promise<string | null> {
  const supabase = createServiceClient()

  const badgeInfo = getBadgeInfo(badgeType)

  const { data, error } = await supabase
    .from('mentor_badges')
    .insert({
      mentor_profile_id: mentorProfileId,
      type: badgeType,
      label: badgeInfo.label,
      collaboration_id: collaborationId || null,
      metadata: metadata || {},
      earned_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    // Check if it's a unique constraint violation (badge already exists)
    if (error.code === '23505') {
      console.log(`Badge ${badgeType} already awarded to mentor ${mentorProfileId}`)
      return null
    }
    throw new Error(`Failed to award badge: ${error.message}`)
  }

  return data.id
}

/**
 * Check and award milestone badges based on completion count
 */
export async function checkAndAwardMilestoneBadges(
  mentorProfileId: string,
  collaborationId: string
): Promise<string[]> {
  const supabase = createServiceClient()
  const awardedBadgeIds: string[] = []

  // Count completed goals for this mentor
  const { count, error: countError } = await supabase
    .from('goal_completions')
    .select('id', { count: 'exact', head: true })
    .eq('confirmed_by', mentorProfileId)

  if (countError) {
    console.error('Error counting completions:', countError)
    return awardedBadgeIds
  }

  const completionCount = count || 0

  // Check for first completion badge
  if (completionCount === 1) {
    const badgeId = await awardBadge(
      mentorProfileId,
      'first_completion',
      collaborationId,
      { totalCompletions: 1 }
    )
    if (badgeId) awardedBadgeIds.push(badgeId)
  }

  // Check for 5 completions badge
  if (completionCount === 5) {
    const badgeId = await awardBadge(
      mentorProfileId,
      'five_completions',
      collaborationId,
      { totalCompletions: 5 }
    )
    if (badgeId) awardedBadgeIds.push(badgeId)
  }

  // Check for 10 completions badge
  if (completionCount === 10) {
    const badgeId = await awardBadge(
      mentorProfileId,
      'ten_completions',
      collaborationId,
      { totalCompletions: 10 }
    )
    if (badgeId) awardedBadgeIds.push(badgeId)
  }

  return awardedBadgeIds
}

/**
 * Check and award rating-based badges
 */
export async function checkAndAwardRatingBadge(
  mentorProfileId: string,
  collaborationId: string,
  rating: number
): Promise<string | null> {
  // Only award highly_rated badge for 5-star ratings
  if (rating < 5) return null

  const supabase = createServiceClient()

  // Count 5-star ratings for this mentor
  const { count, error: countError } = await supabase
    .from('goal_completions')
    .select('id', { count: 'exact', head: true })
    .eq('confirmed_by', mentorProfileId)
    .eq('rating', 5)

  if (countError) {
    console.error('Error counting 5-star ratings:', countError)
    return null
  }

  // Award highly_rated badge after 3 five-star ratings
  if (count && count >= 3) {
    return await awardBadge(mentorProfileId, 'highly_rated', collaborationId, {
      rating,
      awardedFor: `${count} five-star ratings`,
    })
  }

  return null
}

/**
 * Award all applicable badges when a goal is confirmed complete
 *
 * @param mentorProfileId - The mentor's profile ID
 * @param collaborationId - The collaboration ID
 * @param goalCompletionId - The goal completion record ID
 * @param rating - Optional rating given by mentee
 * @returns Array of awarded badge IDs
 */
export async function awardCompletionBadges(
  mentorProfileId: string,
  collaborationId: string,
  goalCompletionId: string,
  rating?: number
): Promise<string[]> {
  const awardedBadgeIds: string[] = []

  try {
    // Check and award milestone-based badges
    const milestoneBadges = await checkAndAwardMilestoneBadges(
      mentorProfileId,
      collaborationId
    )
    awardedBadgeIds.push(...milestoneBadges)

    // Check and award rating-based badges
    if (rating) {
      const ratingBadge = await checkAndAwardRatingBadge(
        mentorProfileId,
        collaborationId,
        rating
      )
      if (ratingBadge) awardedBadgeIds.push(ratingBadge)
    }

    // Update goal_completion with badge_awarded_at if any badges were awarded
    if (awardedBadgeIds.length > 0) {
      const supabase = createServiceClient()
      await supabase
        .from('goal_completions')
        .update({ badge_awarded_at: new Date().toISOString() })
        .eq('id', goalCompletionId)
    }

    return awardedBadgeIds
  } catch (error) {
    console.error('Error awarding completion badges:', error)
    return awardedBadgeIds
  }
}

/**
 * Get all badges for a mentor
 */
export async function getMentorBadges(mentorProfileId: string): Promise<
  Array<{
    id: string
    type: BadgeType
    label: string
    collaboration_id: string | null
    metadata: BadgeMetadata
    earned_at: string
  }>
> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('mentor_badges')
    .select('id, type, label, collaboration_id, metadata, earned_at')
    .eq('mentor_profile_id', mentorProfileId)
    .order('earned_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch mentor badges: ${error.message}`)
  }

  return data || []
}

/**
 * Check if mentor has a specific badge
 */
export async function hasBadge(
  mentorProfileId: string,
  badgeType: BadgeType
): Promise<boolean> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('mentor_badges')
    .select('id')
    .eq('mentor_profile_id', mentorProfileId)
    .eq('type', badgeType)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return false // Not found
    throw new Error(`Failed to check badge: ${error.message}`)
  }

  return !!data
}

/**
 * Get badge count for a mentor
 */
export async function getBadgeCount(mentorProfileId: string): Promise<number> {
  const supabase = createServiceClient()

  const { count, error } = await supabase
    .from('mentor_badges')
    .select('id', { count: 'exact', head: true })
    .eq('mentor_profile_id', mentorProfileId)

  if (error) {
    throw new Error(`Failed to count badges: ${error.message}`)
  }

  return count || 0
}
