import type { MatchingProfile } from './types'

type DbProfileRow = {
  id: string
  display_name: string | null
  public_handle: string | null
  city: string | null
  country: string | null
  gender: string | null
  languages_spoken?: string[] | null
  can_mentor_for?: string[] | null
  want_to_learn?: string[] | null
  specializations?: string[] | null
  hobbies?: string[] | null
  expertise_areas?: string[] | null
  languages?: string[] | null
  preferred_mentor_gender?: string | null
}

type DbWorkRow = {
  profile_id: string
  company: string
  title: string | null
  is_current?: boolean | null
}

type DbEducationRow = {
  profile_id: string
  institution: string
  degree: string | null
}

type DbSkillRow = {
  profile_id: string
  name: string
}

export function mapProfileRowToMatchingProfile(
  row: DbProfileRow,
  work: DbWorkRow[],
  educations: DbEducationRow[],
  skills: DbSkillRow[],
  linkedinConnections?: string[]
): MatchingProfile {
  return {
    profileId: row.id,
    displayName: row.display_name,
    publicHandle: row.public_handle,
    city: row.city,
    country: row.country,
    gender: row.gender,
    languagesSpoken: row.languages_spoken ?? [],
    canMentorFor: row.can_mentor_for ?? [],
    wantToLearn: row.want_to_learn ?? [],
    specializations: row.specializations ?? [],
    hobbies: row.hobbies ?? [],
    expertiseAreas: row.expertise_areas ?? [],
    mentorLanguages: row.languages ?? [],
    workExperiences: work.map((w) => ({
      company: w.company,
      title: w.title,
      is_current: w.is_current ?? false,
    })),
    educations: educations.map((e) => ({
      institution: e.institution,
      degree: e.degree,
    })),
    skillNames: skills.map((s) => s.name),
    linkedinConnections,
    preferredMentorGender: row.preferred_mentor_gender ?? null,
  }
}
