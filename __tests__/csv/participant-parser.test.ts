/**
 * CSV Participant Parser Tests - M2
 */

import { describe, it, expect } from 'vitest'
import { parseParticipantCSV, ParticipantRowSchema, generateCSVTemplate } from '@/lib/csv/participant-parser'

describe('ParticipantRowSchema', () => {
  it('should validate a valid participant row', () => {
    const valid = {
      email: 'student@school.edu',
      name: 'John Smith',
      role: 'mentee' as const,
      year_grade: 'Grade 11',
    }

    const result = ParticipantRowSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('should validate mentor role', () => {
    const valid = {
      email: 'mentor@school.edu',
      name: 'Dr. Jane Doe',
      role: 'mentor' as const,
    }

    const result = ParticipantRowSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const invalid = {
      email: 'not-an-email',
      name: 'John Smith',
      role: 'mentee' as const,
    }

    const result = ParticipantRowSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should reject empty name', () => {
    const invalid = {
      email: 'student@school.edu',
      name: '',
      role: 'mentee' as const,
    }

    const result = ParticipantRowSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should reject invalid role', () => {
    const invalid = {
      email: 'student@school.edu',
      name: 'John',
      role: 'teacher',
    }

    const result = ParticipantRowSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('parseParticipantCSV', () => {
  it('should parse a valid CSV', () => {
    const csv = `email,name,role,year_grade
student1@school.edu,John Smith,mentee,Grade 11
student2@school.edu,Jane Doe,mentee,Grade 12
mentor1@school.edu,Dr. Brown,mentor,`

    const result = parseParticipantCSV(csv)

    expect(result.success).toBe(true)
    expect(result.participants.length).toBe(3)
    expect(result.errors.length).toBe(0)
    expect(result.stats.menteeCount).toBe(2)
    expect(result.stats.mentorCount).toBe(1)
  })

  it('should handle quoted values', () => {
    const csv = `email,name,role,year_grade
student@school.edu,"Smith, John Jr.",mentee,Grade 11`

    const result = parseParticipantCSV(csv)

    expect(result.success).toBe(true)
    expect(result.participants[0].name).toBe('Smith, John Jr.')
  })

  it('should normalize role aliases', () => {
    const csv = `email,name,role
student@school.edu,John,student
teacher@school.edu,Jane,teacher`

    const result = parseParticipantCSV(csv)

    expect(result.success).toBe(true)
    expect(result.participants[0].role).toBe('mentee')
    expect(result.participants[1].role).toBe('mentor')
  })

  it('should detect duplicate emails', () => {
    const csv = `email,name,role
student@school.edu,John,mentee
student@school.edu,John Duplicate,mentee`

    const result = parseParticipantCSV(csv)

    expect(result.participants.length).toBe(1)
    expect(result.warnings.length).toBe(1)
    expect(result.stats.duplicateEmails).toContain('student@school.edu')
  })

  it('should report errors for invalid rows', () => {
    const csv = `email,name,role
invalid-email,John,mentee
student@school.edu,,mentee
student2@school.edu,Jane,invalid`

    const result = parseParticipantCSV(csv)

    expect(result.success).toBe(false)
    expect(result.errors.length).toBe(3)
    expect(result.participants.length).toBe(0)
  })

  it('should handle empty CSV', () => {
    const result = parseParticipantCSV('')

    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should handle missing header columns', () => {
    const csv = `email,name
student@school.edu,John`

    const result = parseParticipantCSV(csv)

    expect(result.success).toBe(false)
    expect(result.errors.some(e => e.message.includes('role'))).toBe(true)
  })

  it('should skip empty lines', () => {
    const csv = `email,name,role
student1@school.edu,John,mentee

student2@school.edu,Jane,mentee`

    const result = parseParticipantCSV(csv)

    expect(result.success).toBe(true)
    expect(result.participants.length).toBe(2)
  })
})

describe('generateCSVTemplate', () => {
  it('should generate a valid template', () => {
    const template = generateCSVTemplate()

    expect(template).toContain('email,name,role,year_grade')
    expect(template).toContain('mentee')
    expect(template).toContain('mentor')
  })

  it('should be parseable', () => {
    const template = generateCSVTemplate()
    const result = parseParticipantCSV(template)

    expect(result.success).toBe(true)
    expect(result.participants.length).toBeGreaterThan(0)
  })
})
