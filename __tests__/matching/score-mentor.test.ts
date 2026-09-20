import { describe, it, expect } from 'vitest'
import {
  rankMentorsForMentee,
  scoreMentorForMentee,
} from '@/lib/matching/score-mentor'

describe('scoreMentorForMentee', () => {
  const mentee = {
    profileId: 'mentee-1',
    wantToLearn: ['Product Management', 'Leadership'],
    specializations: ['Marketing'],
    skills: ['SQL'],
  }

  it('ranks mentor with overlapping topics higher', () => {
    const strongMentor = {
      profileId: 'mentor-a',
      canMentorFor: ['Product Management'],
      expertiseAreas: ['Leadership'],
      skills: ['SQL', 'Roadmapping'],
      languages: ['English'],
    }
    const weakMentor = {
      profileId: 'mentor-b',
      canMentorFor: ['Gardening'],
      expertiseAreas: [],
      skills: ['Knitting'],
      languages: [],
    }

    const ranked = rankMentorsForMentee(mentee, [weakMentor, strongMentor])
    expect(ranked[0].mentorProfileId).toBe('mentor-a')
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it('returns score between 0 and 1', () => {
    const result = scoreMentorForMentee(mentee, {
      profileId: 'm',
      canMentorFor: ['Product Management'],
      expertiseAreas: [],
      skills: [],
      languages: [],
    })
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
    expect(result.reasons.length).toBeGreaterThan(0)
  })
})
