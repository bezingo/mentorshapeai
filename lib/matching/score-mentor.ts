export type MentorProfileFeatures = {
  profileId: string
  canMentorFor: string[]
  expertiseAreas: string[]
  skills: string[]
  languages: string[]
}

export type MenteeProfileFeatures = {
  profileId: string
  wantToLearn: string[]
  specializations: string[]
  skills: string[]
}

export type MentorScoreResult = {
  mentorProfileId: string
  score: number
  reasons: string[]
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase()
}

function uniqueNormalized(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeTag(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

function overlapScore(
  left: string[],
  right: string[]
): { score: number; matches: string[] } {
  const a = uniqueNormalized(left)
  const b = uniqueNormalized(right)
  if (a.length === 0 || b.length === 0) {
    return { score: 0, matches: [] }
  }

  const setB = new Set(b)
  const matches = a.filter((tag) => setB.has(tag))
  const union = new Set([...a, ...b])
  return { score: matches.length / union.size, matches }
}

/**
 * Score a single mentor for a mentee using profile tags and skills (0–1).
 */
export function scoreMentorForMentee(
  mentee: MenteeProfileFeatures,
  mentor: MentorProfileFeatures
): MentorScoreResult {
  const mentorTopics = [
    ...mentor.canMentorFor,
    ...mentor.expertiseAreas,
    ...mentor.skills,
  ]
  const menteeNeeds = [
    ...mentee.wantToLearn,
    ...mentee.specializations,
    ...mentee.skills,
  ]

  const topicOverlap = overlapScore(menteeNeeds, mentorTopics)
  const skillOverlap = overlapScore(mentee.skills, mentor.skills)

  const rawScore = topicOverlap.score * 0.7 + skillOverlap.score * 0.3
  const score = Math.min(1, Math.round(rawScore * 100) / 100)

  const reasons: string[] = []
  if (topicOverlap.matches.length > 0) {
    reasons.push(
      `Shared focus: ${topicOverlap.matches.slice(0, 3).join(', ')}`
    )
  }
  if (skillOverlap.matches.length > 0) {
    reasons.push(
      `Skill overlap: ${skillOverlap.matches.slice(0, 3).join(', ')}`
    )
  }
  if (reasons.length === 0) {
    reasons.push('Eligible program mentor (limited profile overlap)')
  }

  return {
    mentorProfileId: mentor.profileId,
    score,
    reasons,
  }
}

/** Rank mentors for one mentee (highest score first). */
export function rankMentorsForMentee(
  mentee: MenteeProfileFeatures,
  mentors: MentorProfileFeatures[]
): MentorScoreResult[] {
  return mentors
    .map((mentor) => scoreMentorForMentee(mentee, mentor))
    .sort((a, b) => b.score - a.score)
}
