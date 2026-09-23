import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GoalOwnershipError, assertGoalOwnedByProfile } from '@/lib/journey/goal-ownership'

const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}))

describe('assertGoalOwnedByProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEq.mockImplementation(() => ({ maybeSingle: mockMaybeSingle, eq: mockEq }))
    mockSelect.mockImplementation(() => ({ eq: mockEq }))
    mockFrom.mockImplementation(() => ({ select: mockSelect }))
  })

  it('passes when goal belongs to profile', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'goal-1', profile_id: 'profile-1' },
      error: null,
    })

    await expect(assertGoalOwnedByProfile('goal-1', 'profile-1')).resolves.toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('goals')
  })

  it('throws GoalOwnershipError when profile mismatches', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'goal-1', profile_id: 'other-profile' },
      error: null,
    })

    await expect(assertGoalOwnedByProfile('goal-1', 'profile-1')).rejects.toBeInstanceOf(
      GoalOwnershipError
    )
  })

  it('throws GoalOwnershipError when goal missing', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    await expect(assertGoalOwnedByProfile('missing', 'profile-1')).rejects.toBeInstanceOf(
      GoalOwnershipError
    )
  })
})
