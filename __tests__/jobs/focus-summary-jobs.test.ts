import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => mockSupabase,
}))

vi.mock('@/lib/ai/transcript-summarizer', () => ({
  fetchTranscriptFromZoom: vi.fn(),
  generateAndSaveFocusSummary: vi.fn(),
}))

import {
  enqueueFocusSummaryJob,
  processFocusSummaryJob,
} from '@/lib/jobs/focus-summary-jobs'
import {
  fetchTranscriptFromZoom,
  generateAndSaveFocusSummary,
} from '@/lib/ai/transcript-summarizer'

describe('enqueueFocusSummaryJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips when a summary already exists', async () => {
    let call = 0
    mockFrom.mockImplementation((table: string) => {
      call += 1
      if (table === 'focus_summaries') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'sum-1' }, error: null }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    const result = await enqueueFocusSummaryJob('focus-1', 'recording.completed')
    expect(result.enqueued).toBe(false)
    expect(result.reason).toBe('summary_exists')
    expect(call).toBe(1)
  })

  it('inserts a new job when none exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'focus_summaries') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      if (table === 'focus_summary_jobs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'job-new' }, error: null }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    const result = await enqueueFocusSummaryJob('focus-2', 'recording.completed')
    expect(result.enqueued).toBe(true)
    expect(result.jobId).toBe('job-new')
  })
})

describe('processFocusSummaryJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseJob = {
    id: 'job-1',
    focus_id: 'focus-1',
    status: 'processing' as const,
    trigger_event: 'recording.completed' as const,
    attempts: 0,
    max_attempts: 8,
    last_error: null,
    scheduled_at: new Date().toISOString(),
    locked_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  it('completes when transcript fetch and summary generation succeed', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'focus_summaries') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnThis(),
        }
      }
      if (table === 'focus_summary_jobs') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    vi.mocked(fetchTranscriptFromZoom).mockResolvedValue('a'.repeat(120))
    vi.mocked(generateAndSaveFocusSummary).mockResolvedValue({
      summaryId: 'sum-1',
      summary: {
        summary: 'ok',
        key_decisions: [],
        mentee_action_items: [],
        mentor_action_items: [],
        milestone_updates: [],
        overall_sentiment: 'positive',
        session_effectiveness: 4,
      },
      actionItemIds: [],
    })

    const result = await processFocusSummaryJob(baseJob)
    expect(result.outcome).toBe('completed')
    expect(generateAndSaveFocusSummary).toHaveBeenCalled()
  })
})
