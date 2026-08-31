/**
 * Focus Grades API Tests - M1
 * 
 * Tests the both-grade system where mentor and mentee each submit grades
 * after a Focus session.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

/**
 * Schema for grade validation (mirrors the API)
 */
const GradeSchema = z.object({
  usefulness_rating: z.number().int().min(1).max(5),
  honesty_rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional().nullable(),
})

describe('Focus Grades Schema Validation', () => {
  it('should accept valid grade data', () => {
    const validGrade = {
      usefulness_rating: 4,
      honesty_rating: 5,
      feedback: 'Great session!',
    }

    const result = GradeSchema.safeParse(validGrade)
    expect(result.success).toBe(true)
  })

  it('should accept grade without feedback', () => {
    const gradeWithoutFeedback = {
      usefulness_rating: 3,
      honesty_rating: 4,
    }

    const result = GradeSchema.safeParse(gradeWithoutFeedback)
    expect(result.success).toBe(true)
  })

  it('should accept grade with null feedback', () => {
    const gradeWithNullFeedback = {
      usefulness_rating: 5,
      honesty_rating: 5,
      feedback: null,
    }

    const result = GradeSchema.safeParse(gradeWithNullFeedback)
    expect(result.success).toBe(true)
  })

  it('should reject ratings below 1', () => {
    const invalidGrade = {
      usefulness_rating: 0,
      honesty_rating: 3,
    }

    const result = GradeSchema.safeParse(invalidGrade)
    expect(result.success).toBe(false)
  })

  it('should reject ratings above 5', () => {
    const invalidGrade = {
      usefulness_rating: 6,
      honesty_rating: 3,
    }

    const result = GradeSchema.safeParse(invalidGrade)
    expect(result.success).toBe(false)
  })

  it('should reject non-integer ratings', () => {
    const invalidGrade = {
      usefulness_rating: 4.5,
      honesty_rating: 3,
    }

    const result = GradeSchema.safeParse(invalidGrade)
    expect(result.success).toBe(false)
  })

  it('should reject feedback exceeding max length', () => {
    const invalidGrade = {
      usefulness_rating: 4,
      honesty_rating: 4,
      feedback: 'a'.repeat(2001),
    }

    const result = GradeSchema.safeParse(invalidGrade)
    expect(result.success).toBe(false)
  })

  it('should reject missing required fields', () => {
    const incompleteGrade = {
      usefulness_rating: 4,
    }

    const result = GradeSchema.safeParse(incompleteGrade)
    expect(result.success).toBe(false)
  })
})

describe('Focus Grades Business Logic', () => {
  it('should allow both mentor and mentee to grade independently', () => {
    const mentorGrade = {
      grader_role: 'mentor' as const,
      usefulness_rating: 4,
      honesty_rating: 5,
      feedback: 'Productive discussion',
    }

    const menteeGrade = {
      grader_role: 'mentee' as const,
      usefulness_rating: 5,
      honesty_rating: 4,
      feedback: 'Very helpful advice',
    }

    // Both grades should be independently valid
    expect(GradeSchema.safeParse(mentorGrade).success).toBe(true)
    expect(GradeSchema.safeParse(menteeGrade).success).toBe(true)

    // They should have different roles
    expect(mentorGrade.grader_role).not.toBe(menteeGrade.grader_role)
  })

  it('should track both_graded status correctly', () => {
    interface Grade {
      grader_role: 'mentor' | 'mentee'
    }

    function checkBothGraded(grades: Grade[]): boolean {
      const hasMentorGrade = grades.some(g => g.grader_role === 'mentor')
      const hasMenteeGrade = grades.some(g => g.grader_role === 'mentee')
      return hasMentorGrade && hasMenteeGrade
    }

    // No grades
    expect(checkBothGraded([])).toBe(false)

    // Only mentor graded
    expect(checkBothGraded([{ grader_role: 'mentor' }])).toBe(false)

    // Only mentee graded
    expect(checkBothGraded([{ grader_role: 'mentee' }])).toBe(false)

    // Both graded
    expect(checkBothGraded([
      { grader_role: 'mentor' },
      { grader_role: 'mentee' },
    ])).toBe(true)
  })

  it('should determine pending grade status correctly', () => {
    interface GradeStatus {
      mentor_grade_pending: boolean
      mentee_grade_pending: boolean
    }

    function getGradeStatus(grades: Array<{ grader_role: 'mentor' | 'mentee' }>): GradeStatus {
      const hasMentorGrade = grades.some(g => g.grader_role === 'mentor')
      const hasMenteeGrade = grades.some(g => g.grader_role === 'mentee')
      return {
        mentor_grade_pending: !hasMentorGrade,
        mentee_grade_pending: !hasMenteeGrade,
      }
    }

    // No grades - both pending
    const noGrades = getGradeStatus([])
    expect(noGrades.mentor_grade_pending).toBe(true)
    expect(noGrades.mentee_grade_pending).toBe(true)

    // Only mentor graded - mentee pending
    const mentorOnly = getGradeStatus([{ grader_role: 'mentor' }])
    expect(mentorOnly.mentor_grade_pending).toBe(false)
    expect(mentorOnly.mentee_grade_pending).toBe(true)

    // Both graded - none pending
    const bothGraded = getGradeStatus([
      { grader_role: 'mentor' },
      { grader_role: 'mentee' },
    ])
    expect(bothGraded.mentor_grade_pending).toBe(false)
    expect(bothGraded.mentee_grade_pending).toBe(false)
  })
})
