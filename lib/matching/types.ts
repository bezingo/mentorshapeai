/**
 * Types for mentor–mentee matching (onboarding agent + API).
 */

export interface WorkExperienceSnippet {
  company: string
  title?: string | null
  is_current?: boolean
}

export interface EducationSnippet {
  institution: string
  degree?: string | null
}

export interface MatchingProfile {
  profileId: string
  displayName: string | null
  publicHandle: string | null
  city: string | null
  country: string | null
  gender: string | null
  languagesSpoken: string[]
  /** Mentor mentoring topics; mentee learning interests */
  canMentorFor: string[]
  wantToLearn: string[]
  specializations: string[]
  hobbies: string[]
  expertiseAreas: string[]
  mentorLanguages: string[]
  workExperiences: WorkExperienceSnippet[]
  educations: EducationSnippet[]
  skillNames: string[]
  /** LinkedIn connection profile IDs or vanity names when available */
  linkedinConnections?: string[]
  /** When set, mentor gender should align for full language/gender signal */
  preferredMentorGender?: string | null
}

export type ScoreSignalKey =
  | 'alumni'
  | 'same_city'
  | 'language_gender'
  | 'work_alignment'
  | 'common_connections'
  | 'interests'

export interface ScoreSignalBreakdown {
  key: ScoreSignalKey
  label: string
  points: number
  maxPoints: number
  summary: string
}

export interface MentorMatchResult {
  mentorProfileId: string
  displayName: string | null
  publicHandle: string | null
  headline: string | null
  avatarUrl: string | null
  score: number
  breakdown: ScoreSignalBreakdown[]
  highlights: string[]
}
