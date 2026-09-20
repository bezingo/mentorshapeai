import type {
  MatchingProfile,
  MentorMatchResult,
  ScoreSignalBreakdown,
  ScoreSignalKey,
} from './types'

/** Max points per signal (sum = 100). */
const SIGNAL_MAX: Record<ScoreSignalKey, number> = {
  alumni: 30,
  same_city: 20,
  language_gender: 15,
  work_alignment: 15,
  common_connections: 10,
  interests: 10,
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase()
}

function uniqueNormalized(values: string[]): string[] {
  const seen = new Set<string>()
  for (const v of values) {
    const n = normalizeToken(v)
    if (n) seen.add(n)
  }
  return [...seen]
}

function overlapRatio(a: string[], b: string[]): number {
  const setB = new Set(uniqueNormalized(b))
  if (setB.size === 0) return 0
  const setA = uniqueNormalized(a)
  if (setA.length === 0) return 0
  let hits = 0
  for (const item of setA) {
    if (setB.has(item)) hits++
  }
  return hits / Math.max(setA.length, 1)
}

function fuzzyOverlap(a: string[], b: string[]): number {
  const normB = uniqueNormalized(b)
  const normA = uniqueNormalized(a)
  if (!normA.length || !normB.length) return 0
  let hits = 0
  for (const left of normA) {
    for (const right of normB) {
      if (left === right || left.includes(right) || right.includes(left)) {
        hits++
        break
      }
    }
  }
  return hits / normA.length
}

function scoreAlumni(mentee: MatchingProfile, mentor: MatchingProfile): ScoreSignalBreakdown {
  const menteeCompanies = uniqueNormalized(
    mentee.workExperiences.map((w) => w.company)
  )
  const mentorCompanies = uniqueNormalized(
    mentor.workExperiences.map((w) => w.company)
  )
  const menteeSchools = uniqueNormalized(
    mentee.educations.map((e) => e.institution)
  )
  const mentorSchools = uniqueNormalized(
    mentor.educations.map((e) => e.institution)
  )

  const companyOverlap = overlapRatio(menteeCompanies, mentorCompanies)
  const schoolOverlap = overlapRatio(menteeSchools, mentorSchools)
  const ratio = Math.max(companyOverlap, schoolOverlap)
  const points = Math.round(ratio * SIGNAL_MAX.alumni)

  const summaries: string[] = []
  if (companyOverlap > 0) summaries.push('shared workplaces')
  if (schoolOverlap > 0) summaries.push('shared schools or universities')

  return {
    key: 'alumni',
    label: 'Alumni & shared history',
    points,
    maxPoints: SIGNAL_MAX.alumni,
    summary:
      summaries.length > 0
        ? `Matched on ${summaries.join(' and ')}`
        : 'No shared schools or employers',
  }
}

function scoreSameCity(mentee: MatchingProfile, mentor: MatchingProfile): ScoreSignalBreakdown {
  const menteeCity = mentee.city ? normalizeToken(mentee.city) : ''
  const mentorCity = mentor.city ? normalizeToken(mentor.city) : ''
  const sameCity =
    menteeCity.length > 0 && mentorCity.length > 0 && menteeCity === mentorCity
  const points = sameCity ? SIGNAL_MAX.same_city : 0

  return {
    key: 'same_city',
    label: 'Location',
    points,
    maxPoints: SIGNAL_MAX.same_city,
    summary: sameCity
      ? `Both based in ${mentee.city}`
      : mentee.city && mentor.city
        ? `Different cities (${mentee.city} vs ${mentor.city})`
        : 'City not set on one or both profiles',
  }
}

function scoreLanguageGender(
  mentee: MatchingProfile,
  mentor: MatchingProfile
): ScoreSignalBreakdown {
  const menteeLangs = [
    ...mentee.languagesSpoken,
    ...mentee.mentorLanguages,
  ]
  const mentorLangs = [
    ...mentor.languagesSpoken,
    ...mentor.mentorLanguages,
  ]
  const langRatio = overlapRatio(menteeLangs, mentorLangs)

  const preferredGender = mentee.preferredMentorGender?.trim()
  let genderFactor = 1
  let genderNote = 'No mentor gender preference set'
  if (preferredGender && preferredGender !== 'Prefer not to say') {
    if (mentor.gender && mentor.gender === preferredGender) {
      genderFactor = 1
      genderNote = `Mentor gender matches your preference (${preferredGender})`
    } else if (mentor.gender) {
      genderFactor = 0.35
      genderNote = `Mentor gender (${mentor.gender}) differs from preference (${preferredGender})`
    } else {
      genderFactor = 0.6
      genderNote = 'Mentor has not shared gender on profile'
    }
  }

  const combined = langRatio * 0.7 + genderFactor * 0.3
  const points = Math.round(combined * SIGNAL_MAX.language_gender)

  return {
    key: 'language_gender',
    label: 'Language & preferences',
    points,
    maxPoints: SIGNAL_MAX.language_gender,
    summary:
      langRatio > 0
        ? `Shared languages; ${genderNote}`
        : `Limited language overlap; ${genderNote}`,
  }
}

function scoreWorkAlignment(
  mentee: MatchingProfile,
  mentor: MatchingProfile
): ScoreSignalBreakdown {
  const menteeTitles = mentee.workExperiences.map((w) => w.title || '').filter(Boolean)
  const mentorTitles = mentor.workExperiences.map((w) => w.title || '').filter(Boolean)
  const titleRatio = fuzzyOverlap(menteeTitles, mentorTitles)
  const expertiseRatio = overlapRatio(mentee.wantToLearn, mentor.expertiseAreas)
  const mentorForRatio = overlapRatio(mentee.wantToLearn, mentor.canMentorFor)
  const skillRatio = overlapRatio(mentee.wantToLearn, mentor.skillNames)
  const ratio = Math.max(titleRatio, expertiseRatio, mentorForRatio, skillRatio)
  const points = Math.round(ratio * SIGNAL_MAX.work_alignment)

  return {
    key: 'work_alignment',
    label: 'Work & expertise alignment',
    points,
    maxPoints: SIGNAL_MAX.work_alignment,
    summary:
      ratio > 0
        ? 'Your learning goals align with mentor experience or expertise'
        : 'Limited overlap with current work and expertise signals',
  }
}

function scoreCommonConnections(
  mentee: MatchingProfile,
  mentor: MatchingProfile
): ScoreSignalBreakdown {
  const a = mentee.linkedinConnections ?? []
  const b = mentor.linkedinConnections ?? []
  if (!a.length || !b.length) {
    return {
      key: 'common_connections',
      label: 'Common connections',
      points: 0,
      maxPoints: SIGNAL_MAX.common_connections,
      summary: 'LinkedIn mutual connections not imported yet',
    }
  }
  const setB = new Set(b.map(normalizeToken))
  let mutual = 0
  for (const id of a) {
    if (setB.has(normalizeToken(id))) mutual++
  }
  const ratio = Math.min(1, mutual / 5)
  const points = Math.round(ratio * SIGNAL_MAX.common_connections)

  return {
    key: 'common_connections',
    label: 'Common connections',
    points,
    maxPoints: SIGNAL_MAX.common_connections,
    summary: mutual > 0 ? `${mutual} mutual connection(s) on LinkedIn` : 'No mutual connections found',
  }
}

function scoreInterests(mentee: MatchingProfile, mentor: MatchingProfile): ScoreSignalBreakdown {
  const menteeInterests = [
    ...mentee.wantToLearn,
    ...mentee.hobbies,
    ...mentee.specializations,
  ]
  const mentorInterests = [
    ...mentor.hobbies,
    ...mentor.specializations,
    ...mentor.canMentorFor,
  ]
  const ratio = overlapRatio(menteeInterests, mentorInterests)
  const points = Math.round(ratio * SIGNAL_MAX.interests)

  return {
    key: 'interests',
    label: 'Interests overlap',
    points,
    maxPoints: SIGNAL_MAX.interests,
    summary:
      ratio > 0
        ? 'Shared interests or learning topics'
        : 'Few shared interest tags',
  }
}

export function scoreMentorMatch(
  mentee: MatchingProfile,
  mentor: MatchingProfile,
  options?: { headline?: string | null; avatarUrl?: string | null }
): MentorMatchResult {
  const breakdown: ScoreSignalBreakdown[] = [
    scoreAlumni(mentee, mentor),
    scoreSameCity(mentee, mentor),
    scoreLanguageGender(mentee, mentor),
    scoreWorkAlignment(mentee, mentor),
    scoreCommonConnections(mentee, mentor),
    scoreInterests(mentee, mentor),
  ]

  const score = Math.min(
    100,
    breakdown.reduce((sum, row) => sum + row.points, 0)
  )

  const highlights = breakdown
    .filter((row) => row.points >= row.maxPoints * 0.5)
    .map((row) => row.summary)
    .slice(0, 3)

  return {
    mentorProfileId: mentor.profileId,
    displayName: mentor.displayName,
    publicHandle: mentor.publicHandle,
    headline: options?.headline ?? null,
    avatarUrl: options?.avatarUrl ?? null,
    score,
    breakdown,
    highlights,
  }
}

export function rankMentorMatches(
  mentee: MatchingProfile,
  mentors: Array<{
    profile: MatchingProfile
    headline?: string | null
    avatarUrl?: string | null
  }>,
  limit = 20
): MentorMatchResult[] {
  return mentors
    .map(({ profile, headline, avatarUrl }) =>
      scoreMentorMatch(mentee, profile, { headline, avatarUrl })
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
