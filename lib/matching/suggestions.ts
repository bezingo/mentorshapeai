import { createServiceClient } from '@/lib/supabase/service'
import { mapProfileRowToMatchingProfile } from './profile-mapper'
import { rankMentorMatches } from './score-mentor'
import type { MentorMatchResult } from './types'

export interface MatchingSuggestionsOptions {
  menteeProfileId: string
  limit?: number
  skillsFilter?: string[]
}

export async function getMatchingSuggestions(
  options: MatchingSuggestionsOptions
): Promise<{ menteeProfileId: string; suggestions: MentorMatchResult[] }> {
  const supabase = createServiceClient()
  const limit = options.limit ?? 15

  const { data: menteeRow, error: menteeError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      display_name,
      public_handle,
      city,
      country,
      gender,
      languages_spoken,
      can_mentor_for,
      want_to_learn,
      specializations,
      hobbies,
      expertise_areas,
      languages
    `
    )
    .eq('id', options.menteeProfileId)
    .single()

  if (menteeError || !menteeRow) {
    throw new Error('Mentee profile not found')
  }

  let mentorQuery = supabase
    .from('profiles')
    .select(
      `
      id,
      display_name,
      public_handle,
      headline,
      avatar_url,
      city,
      country,
      gender,
      languages_spoken,
      can_mentor_for,
      want_to_learn,
      specializations,
      hobbies,
      expertise_areas,
      languages
    `
    )
    .eq('is_mentor', true)
    .not('public_handle', 'is', null)
    .neq('id', options.menteeProfileId)
    .limit(100)

  const { data: mentorRows, error: mentorsError } = await mentorQuery

  if (mentorsError) {
    throw new Error(mentorsError.message)
  }

  const mentors = mentorRows ?? []
  if (mentors.length === 0) {
    return { menteeProfileId: options.menteeProfileId, suggestions: [] }
  }

  const profileIds = [menteeRow.id, ...mentors.map((m) => m.id)]

  const [workRes, eduRes, skillsRes] = await Promise.all([
    supabase
      .from('work_experiences')
      .select('profile_id, company, title, is_current')
      .in('profile_id', profileIds),
    supabase
      .from('educations')
      .select('profile_id, institution, degree')
      .in('profile_id', profileIds),
    supabase.from('skills').select('profile_id, name').in('profile_id', profileIds),
  ])

  const workByProfile = new Map<string, typeof workRes.data>()
  for (const row of workRes.data ?? []) {
    const list = workByProfile.get(row.profile_id) ?? []
    list.push(row)
    workByProfile.set(row.profile_id, list)
  }

  const eduByProfile = new Map<string, typeof eduRes.data>()
  for (const row of eduRes.data ?? []) {
    const list = eduByProfile.get(row.profile_id) ?? []
    list.push(row)
    eduByProfile.set(row.profile_id, list)
  }

  const skillsByProfile = new Map<string, typeof skillsRes.data>()
  for (const row of skillsRes.data ?? []) {
    const list = skillsByProfile.get(row.profile_id) ?? []
    list.push(row)
    skillsByProfile.set(row.profile_id, list)
  }

  const menteeProfile = mapProfileRowToMatchingProfile(
    menteeRow,
    workByProfile.get(menteeRow.id) ?? [],
    eduByProfile.get(menteeRow.id) ?? [],
    skillsByProfile.get(menteeRow.id) ?? []
  )

  let mentorCandidates = mentors.map((row) => ({
    profile: mapProfileRowToMatchingProfile(
      row,
      workByProfile.get(row.id) ?? [],
      eduByProfile.get(row.id) ?? [],
      skillsByProfile.get(row.id) ?? []
    ),
    headline: row.headline as string | null,
    avatarUrl: row.avatar_url as string | null,
  }))

  if (options.skillsFilter && options.skillsFilter.length > 0) {
    const filters = options.skillsFilter.map((s) => s.toLowerCase())
    mentorCandidates = mentorCandidates.filter(({ profile }) => {
      const haystack = [
        ...profile.expertiseAreas,
        ...profile.canMentorFor,
        ...profile.skillNames,
      ].map((v) => v.toLowerCase())
      return filters.some((f) => haystack.some((h) => h.includes(f) || f.includes(h)))
    })
  }

  const suggestions = rankMentorMatches(menteeProfile, mentorCandidates, limit)

  return { menteeProfileId: options.menteeProfileId, suggestions }
}
