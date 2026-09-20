import { describe, it, expect } from 'vitest'
import { rankMentorMatches, scoreMentorMatch } from '@/lib/matching/score-mentor'
import type { MatchingProfile } from '@/lib/matching/types'

const baseMentee: MatchingProfile = {
  profileId: 'mentee-1',
  displayName: 'Alex Mentee',
  publicHandle: 'alex',
  city: 'Dubai',
  country: 'UAE',
  gender: 'Female',
  preferredMentorGender: 'Female',
  languagesSpoken: ['English', 'Arabic'],
  canMentorFor: [],
  wantToLearn: ['Product Management', 'Growth'],
  specializations: ['Marketing'],
  hobbies: ['Hiking'],
  expertiseAreas: [],
  mentorLanguages: [],
  workExperiences: [
    { company: 'Workday', title: 'Growth Analyst', is_current: true },
  ],
  educations: [{ institution: 'McGill University', degree: 'MBA' }],
  skillNames: ['Analytics'],
  linkedinConnections: ['conn-a', 'conn-b'],
}

const strongMentor: MatchingProfile = {
  profileId: 'mentor-strong',
  displayName: 'Maya Mentor',
  publicHandle: 'maya',
  city: 'Dubai',
  country: 'UAE',
  gender: 'Female',
  languagesSpoken: ['English'],
  canMentorFor: ['Growth', 'Product Management'],
  wantToLearn: [],
  specializations: ['Marketing'],
  hobbies: ['Hiking', 'Photography'],
  expertiseAreas: ['Product Management', 'Growth'],
  mentorLanguages: ['English', 'Arabic'],
  workExperiences: [
    { company: 'Workday', title: 'Head of Growth', is_current: false },
    { company: 'Hala Insurance', title: 'Growth Manager', is_current: true },
  ],
  educations: [{ institution: 'McGill University', degree: 'Masters' }],
  skillNames: ['Growth', 'Strategy'],
  linkedinConnections: ['conn-b', 'conn-c'],
}

const weakMentor: MatchingProfile = {
  profileId: 'mentor-weak',
  displayName: 'Remote Mentor',
  publicHandle: 'remote',
  city: 'Berlin',
  country: 'Germany',
  gender: 'Male',
  languagesSpoken: ['German'],
  canMentorFor: ['Backend Engineering'],
  wantToLearn: [],
  specializations: ['Java'],
  hobbies: ['Chess'],
  expertiseAreas: ['Distributed Systems'],
  mentorLanguages: ['German'],
  workExperiences: [{ company: 'Acme GmbH', title: 'Engineer', is_current: true }],
  educations: [{ institution: 'TU Berlin', degree: 'BS' }],
  skillNames: ['Java'],
  linkedinConnections: [],
}

describe('scoreMentorMatch', () => {
  it('scores a strong alumni + city match higher than a weak mentor', () => {
    const strong = scoreMentorMatch(baseMentee, strongMentor)
    const weak = scoreMentorMatch(baseMentee, weakMentor)

    expect(strong.score).toBeGreaterThan(weak.score)
    expect(strong.score).toBeLessThanOrEqual(100)
    expect(strong.breakdown.length).toBe(6)
    expect(strong.breakdown.find((b) => b.key === 'alumni')?.points).toBeGreaterThan(0)
    expect(strong.breakdown.find((b) => b.key === 'same_city')?.points).toBe(20)
  })

  it('returns explainable breakdown entries with max points', () => {
    const result = scoreMentorMatch(baseMentee, strongMentor)
    for (const row of result.breakdown) {
      expect(row.points).toBeGreaterThanOrEqual(0)
      expect(row.points).toBeLessThanOrEqual(row.maxPoints)
      expect(row.summary.length).toBeGreaterThan(0)
    }
  })

  it('ranks mentors by descending score', () => {
    const ranked = rankMentorMatches(baseMentee, [
      { profile: weakMentor },
      { profile: strongMentor },
    ])

    expect(ranked[0].mentorProfileId).toBe('mentor-strong')
    expect(ranked[1].mentorProfileId).toBe('mentor-weak')
  })
})
