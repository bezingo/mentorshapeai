import { describe, it, expect } from 'vitest'
import {
  CreateOrganizationSchema,
  JoinOrganizationSchema,
  CreateProgramSchema,
  EnrollProgramParticipantSchema,
} from '@/lib/validations/organization'

describe('Organization validation', () => {
  it('accepts valid organization create payload', () => {
    const result = CreateOrganizationSchema.safeParse({
      name: 'Test University',
      domain: 'university.edu',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short organization name', () => {
    const result = CreateOrganizationSchema.safeParse({ name: 'A' })
    expect(result.success).toBe(false)
  })

  it('normalizes invite code on join', () => {
    const result = JoinOrganizationSchema.safeParse({
      invite_code: ' ABC123 ',
      role: 'mentee',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.invite_code).toBe('abc123')
    }
  })

  it('accepts program create payload', () => {
    const result = CreateProgramSchema.safeParse({
      name: 'Fall 2026 Mentorship',
      start_date: '2026-09-01',
    })
    expect(result.success).toBe(true)
  })

  it('requires email or profile_id for participant enroll', () => {
    const result = EnrollProgramParticipantSchema.safeParse({ role: 'mentee' })
    expect(result.success).toBe(true)
  })
})
