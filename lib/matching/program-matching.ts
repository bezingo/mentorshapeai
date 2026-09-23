import type { SupabaseClient } from '@supabase/supabase-js'
import { rankMentorMatches } from '@/lib/matching/score-mentor'
import type { MatchingProfile, MentorMatchResult } from '@/lib/matching/types'

type ProfileRow = {
  id: string
  display_name: string | null
  public_handle: string | null
  city: string | null
  country: string | null
  gender: string | null
  languages_spoken: string[] | null
  can_mentor_for: string[] | null
  expertise_areas: string[] | null
  want_to_learn: string[] | null
  specializations: string[] | null
  hobbies: string[] | null
  mentor_languages: string[] | null
  preferred_mentor_gender: string | null
}

type SkillRow = {
  profile_id: string
  name: string
}

async function loadProfileFeatures(
  supabase: SupabaseClient,
  profileIds: string[]
): Promise<Map<string, { profile: ProfileRow; skills: string[] }>> {
  if (profileIds.length === 0) {
    return new Map()
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, display_name, public_handle, city, country, gender, languages_spoken, can_mentor_for, expertise_areas, want_to_learn, specializations, hobbies, mentor_languages, preferred_mentor_gender'
    )
    .in('id', profileIds)

  if (profileError) {
    throw profileError
  }

  const { data: skills, error: skillsError } = await supabase
    .from('skills')
    .select('profile_id, name')
    .in('profile_id', profileIds)

  if (skillsError) {
    throw skillsError
  }

  const skillsByProfile = new Map<string, string[]>()
  for (const row of (skills ?? []) as SkillRow[]) {
    const list = skillsByProfile.get(row.profile_id) ?? []
    list.push(row.name)
    skillsByProfile.set(row.profile_id, list)
  }

  const result = new Map<string, { profile: ProfileRow; skills: string[] }>()
  for (const profile of (profiles ?? []) as ProfileRow[]) {
    result.set(profile.id, {
      profile,
      skills: skillsByProfile.get(profile.id) ?? [],
    })
  }

  return result
}

function toMatchingProfile(
  profileId: string,
  bundle: { profile: ProfileRow; skills: string[] }
): MatchingProfile {
  const p = bundle.profile
  return {
    profileId,
    displayName: p.display_name,
    publicHandle: p.public_handle,
    city: p.city,
    country: p.country,
    gender: p.gender,
    languagesSpoken: p.languages_spoken ?? [],
    canMentorFor: p.can_mentor_for ?? [],
    wantToLearn: p.want_to_learn ?? [],
    specializations: p.specializations ?? [],
    hobbies: p.hobbies ?? [],
    expertiseAreas: p.expertise_areas ?? [],
    mentorLanguages: p.mentor_languages ?? [],
    workExperiences: [],
    educations: [],
    skillNames: bundle.skills,
    preferredMentorGender: p.preferred_mentor_gender,
  }
}

export async function getProgramParticipantIds(
  supabase: SupabaseClient,
  programId: string,
  role: 'mentor' | 'mentee'
): Promise<string[]> {
  const { data, error } = await supabase
    .from('program_participants')
    .select('profile_id')
    .eq('program_id', programId)
    .eq('role', role)

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => row.profile_id as string)
}

export async function suggestMentorsForMenteeInProgram(
  supabase: SupabaseClient,
  programId: string,
  menteeProfileId: string,
  limit = 10
): Promise<MentorMatchResult[]> {
  const mentorIds = await getProgramParticipantIds(supabase, programId, 'mentor')
  const featureMap = await loadProfileFeatures(supabase, [
    menteeProfileId,
    ...mentorIds,
  ])

  const menteeBundle = featureMap.get(menteeProfileId)
  if (!menteeBundle) {
    return []
  }

  const mentee = toMatchingProfile(menteeProfileId, menteeBundle)
  const mentors = mentorIds
    .map((id) => {
      const bundle = featureMap.get(id)
      if (!bundle) return null
      return { profile: toMatchingProfile(id, bundle) }
    })
    .filter((m): m is { profile: MatchingProfile } => m !== null)

  return rankMentorMatches(mentee, mentors, limit)
}

export async function runProgramMatching(
  supabase: SupabaseClient,
  programId: string
): Promise<{ created: number; skipped: number }> {
  const menteeIds = await getProgramParticipantIds(supabase, programId, 'mentee')
  let created = 0
  let skipped = 0

  for (const menteeProfileId of menteeIds) {
    const suggestions = await suggestMentorsForMenteeInProgram(
      supabase,
      programId,
      menteeProfileId,
      1
    )
    const top = suggestions[0]
    if (!top) {
      skipped += 1
      continue
    }

    const { error } = await supabase.from('matches').upsert(
      {
        program_id: programId,
        mentor_profile_id: top.mentorProfileId,
        mentee_profile_id: menteeProfileId,
        status: 'proposed',
        match_score: top.score,
      },
      { onConflict: 'program_id,mentor_profile_id,mentee_profile_id' }
    )

    if (error) {
      throw error
    }

    created += 1
  }

  return { created, skipped }
}
