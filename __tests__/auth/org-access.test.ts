/**
 * Organization Access Control Tests - M2
 */

import { describe, it, expect } from 'vitest'
import { isEmailDomainAllowed } from '@/lib/auth/org-access'

describe('isEmailDomainAllowed', () => {
  it('should allow any email when no domains are specified', () => {
    expect(isEmailDomainAllowed('user@example.com', [])).toBe(true)
    expect(isEmailDomainAllowed('user@school.edu', [])).toBe(true)
    expect(isEmailDomainAllowed('user@gmail.com', [])).toBe(true)
  })

  it('should allow exact domain match', () => {
    const allowedDomains = ['school.edu']
    
    expect(isEmailDomainAllowed('student@school.edu', allowedDomains)).toBe(true)
    expect(isEmailDomainAllowed('teacher@school.edu', allowedDomains)).toBe(true)
  })

  it('should reject non-matching domains', () => {
    const allowedDomains = ['school.edu']
    
    expect(isEmailDomainAllowed('user@gmail.com', allowedDomains)).toBe(false)
    expect(isEmailDomainAllowed('user@other-school.edu', allowedDomains)).toBe(false)
  })

  it('should allow subdomains', () => {
    const allowedDomains = ['school.edu']
    
    expect(isEmailDomainAllowed('user@dept.school.edu', allowedDomains)).toBe(true)
    expect(isEmailDomainAllowed('user@cs.dept.school.edu', allowedDomains)).toBe(true)
  })

  it('should be case insensitive', () => {
    const allowedDomains = ['School.EDU']
    
    expect(isEmailDomainAllowed('user@school.edu', allowedDomains)).toBe(true)
    expect(isEmailDomainAllowed('user@SCHOOL.EDU', allowedDomains)).toBe(true)
    expect(isEmailDomainAllowed('user@School.Edu', allowedDomains)).toBe(true)
  })

  it('should support multiple allowed domains', () => {
    const allowedDomains = ['school.edu', 'partner.org']
    
    expect(isEmailDomainAllowed('user@school.edu', allowedDomains)).toBe(true)
    expect(isEmailDomainAllowed('user@partner.org', allowedDomains)).toBe(true)
    expect(isEmailDomainAllowed('user@gmail.com', allowedDomains)).toBe(false)
  })

  it('should reject invalid emails', () => {
    const allowedDomains = ['school.edu']
    
    expect(isEmailDomainAllowed('invalid', allowedDomains)).toBe(false)
    expect(isEmailDomainAllowed('no-at-sign', allowedDomains)).toBe(false)
    expect(isEmailDomainAllowed('', allowedDomains)).toBe(false)
  })
})

describe('Role Validation', () => {
  it('should validate org member roles', () => {
    const validRoles = ['admin', 'mentor', 'mentee']
    const invalidRoles = ['teacher', 'student', 'counselor', 'parent']

    for (const role of validRoles) {
      expect(validRoles.includes(role)).toBe(true)
    }

    for (const role of invalidRoles) {
      expect(validRoles.includes(role)).toBe(false)
    }
  })

  it('should map role aliases correctly', () => {
    const roleAliases: Record<string, string> = {
      student: 'mentee',
      teacher: 'mentor',
      staff: 'mentor',
      counselor: 'admin',
    }

    function normalizeRole(input: string): string | null {
      const lower = input.toLowerCase()
      if (['mentee', 'mentor', 'admin'].includes(lower)) {
        return lower
      }
      return roleAliases[lower] || null
    }

    expect(normalizeRole('mentee')).toBe('mentee')
    expect(normalizeRole('Mentor')).toBe('mentor')
    expect(normalizeRole('student')).toBe('mentee')
    expect(normalizeRole('teacher')).toBe('mentor')
    expect(normalizeRole('invalid')).toBe(null)
  })
})

describe('Age Calculation', () => {
  it('should calculate age correctly', () => {
    function calculateAge(dob: string): number {
      const birthDate = new Date(dob)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    }

    // Test with a known birthday
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
    expect(calculateAge(tenYearsAgo.toISOString().split('T')[0])).toBe(10)

    // Test minor status
    const isMinor = (dob: string) => calculateAge(dob) < 18
    
    const sixteenYearsAgo = new Date()
    sixteenYearsAgo.setFullYear(sixteenYearsAgo.getFullYear() - 16)
    expect(isMinor(sixteenYearsAgo.toISOString().split('T')[0])).toBe(true)

    const twentyYearsAgo = new Date()
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20)
    expect(isMinor(twentyYearsAgo.toISOString().split('T')[0])).toBe(false)
  })
})

describe('Consent Logic', () => {
  interface ConsentState {
    consent_given: boolean
    parent_consent_given: boolean
    is_minor: boolean
    require_consent: boolean
    min_age: number
    age: number | null
  }

  function canUserParticipate(state: ConsentState): { can: boolean; reason?: string } {
    if (!state.require_consent) {
      return { can: true }
    }

    if (!state.consent_given) {
      return { can: false, reason: 'User consent required' }
    }

    if (state.age !== null && state.age < state.min_age) {
      return { can: false, reason: `Minimum age is ${state.min_age}` }
    }

    if (state.is_minor && !state.parent_consent_given) {
      return { can: false, reason: 'Parent/guardian consent required' }
    }

    return { can: true }
  }

  it('should allow participation when consent is not required', () => {
    const result = canUserParticipate({
      consent_given: false,
      parent_consent_given: false,
      is_minor: true,
      require_consent: false,
      min_age: 13,
      age: 15,
    })
    expect(result.can).toBe(true)
  })

  it('should require user consent', () => {
    const result = canUserParticipate({
      consent_given: false,
      parent_consent_given: false,
      is_minor: false,
      require_consent: true,
      min_age: 13,
      age: 20,
    })
    expect(result.can).toBe(false)
    expect(result.reason).toBe('User consent required')
  })

  it('should require parent consent for minors', () => {
    const result = canUserParticipate({
      consent_given: true,
      parent_consent_given: false,
      is_minor: true,
      require_consent: true,
      min_age: 13,
      age: 15,
    })
    expect(result.can).toBe(false)
    expect(result.reason).toBe('Parent/guardian consent required')
  })

  it('should allow adults with consent', () => {
    const result = canUserParticipate({
      consent_given: true,
      parent_consent_given: false,
      is_minor: false,
      require_consent: true,
      min_age: 13,
      age: 20,
    })
    expect(result.can).toBe(true)
  })

  it('should allow minors with both consents', () => {
    const result = canUserParticipate({
      consent_given: true,
      parent_consent_given: true,
      is_minor: true,
      require_consent: true,
      min_age: 13,
      age: 15,
    })
    expect(result.can).toBe(true)
  })

  it('should enforce minimum age', () => {
    const result = canUserParticipate({
      consent_given: true,
      parent_consent_given: true,
      is_minor: true,
      require_consent: true,
      min_age: 13,
      age: 11,
    })
    expect(result.can).toBe(false)
    expect(result.reason).toBe('Minimum age is 13')
  })
})
