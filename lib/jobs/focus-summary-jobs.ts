import { createServiceClient } from '@/lib/supabase/service'
import {
  fetchTranscriptFromZoom,
  generateAndSaveFocusSummary,
} from '@/lib/ai/transcript-summarizer'

export type FocusSummaryJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type FocusSummaryTriggerEvent =
  | 'recording.completed'
  | 'meeting.ended'
  | 'manual'

export interface FocusSummaryJob {
  id: string
  focus_id: string
  status: FocusSummaryJobStatus
  trigger_event: FocusSummaryTriggerEvent
  attempts: number
  max_attempts: number
  last_error: string | null
  scheduled_at: string
  locked_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

const DEFAULT_MAX_ATTEMPTS = 8
const BATCH_SIZE = 10

function backoffMinutes(attempts: number): number {
  return Math.min(60, Math.pow(2, Math.max(0, attempts - 1)))
}

/**
 * Idempotently queue AI summary generation for a focus (one job per focus).
 */
export async function enqueueFocusSummaryJob(
  focusId: string,
  triggerEvent: FocusSummaryTriggerEvent
): Promise<{ enqueued: boolean; jobId?: string; reason?: string }> {
  const supabase = createServiceClient()

  const { data: existingSummary } = await supabase
    .from('focus_summaries')
    .select('id')
    .eq('focus_id', focusId)
    .maybeSingle()

  if (existingSummary) {
    return { enqueued: false, reason: 'summary_exists' }
  }

  const { data: existingJob, error: fetchError } = await supabase
    .from('focus_summary_jobs')
    .select('*')
    .eq('focus_id', focusId)
    .maybeSingle()

  if (fetchError) {
    throw new Error(`Failed to load summary job: ${fetchError.message}`)
  }

  if (existingJob) {
    if (existingJob.status === 'completed') {
      return { enqueued: false, jobId: existingJob.id, reason: 'job_completed' }
    }
    if (existingJob.status === 'pending' || existingJob.status === 'processing') {
      return { enqueued: false, jobId: existingJob.id, reason: 'job_in_progress' }
    }

    const { data: resetJob, error: resetError } = await supabase
      .from('focus_summary_jobs')
      .update({
        status: 'pending',
        trigger_event: triggerEvent,
        attempts: 0,
        last_error: null,
        scheduled_at: new Date().toISOString(),
        locked_at: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingJob.id)
      .select('id')
      .single()

    if (resetError) {
      throw new Error(`Failed to reset summary job: ${resetError.message}`)
    }

    return { enqueued: true, jobId: resetJob.id }
  }

  const { data: newJob, error: insertError } = await supabase
    .from('focus_summary_jobs')
    .insert({
      focus_id: focusId,
      status: 'pending',
      trigger_event: triggerEvent,
      max_attempts: DEFAULT_MAX_ATTEMPTS,
      scheduled_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return { enqueued: false, reason: 'duplicate' }
    }
    throw new Error(`Failed to enqueue summary job: ${insertError.message}`)
  }

  return { enqueued: true, jobId: newJob.id }
}

async function markJobCompleted(jobId: string): Promise<void> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  await supabase
    .from('focus_summary_jobs')
    .update({
      status: 'completed',
      completed_at: now,
      locked_at: null,
      last_error: null,
      updated_at: now,
    })
    .eq('id', jobId)
}

async function markJobRetryOrFailed(
  job: FocusSummaryJob,
  errorMessage: string
): Promise<'retry' | 'failed'> {
  const supabase = createServiceClient()
  const nextAttempts = job.attempts + 1
  const now = new Date()

  if (nextAttempts >= job.max_attempts) {
    await supabase
      .from('focus_summary_jobs')
      .update({
        status: 'failed',
        attempts: nextAttempts,
        last_error: errorMessage,
        locked_at: null,
        updated_at: now.toISOString(),
      })
      .eq('id', job.id)
    return 'failed'
  }

  const retryAt = new Date(now.getTime() + backoffMinutes(nextAttempts) * 60 * 1000)

  await supabase
    .from('focus_summary_jobs')
    .update({
      status: 'pending',
      attempts: nextAttempts,
      last_error: errorMessage,
      scheduled_at: retryAt.toISOString(),
      locked_at: null,
      updated_at: now.toISOString(),
    })
    .eq('id', job.id)

  return 'retry'
}

/**
 * Run summary generation for a single queued job.
 */
export async function processFocusSummaryJob(
  job: FocusSummaryJob
): Promise<{ outcome: 'completed' | 'retry' | 'failed' | 'skipped'; error?: string }> {
  const supabase = createServiceClient()

  const { data: summary } = await supabase
    .from('focus_summaries')
    .select('id')
    .eq('focus_id', job.focus_id)
    .maybeSingle()

  if (summary) {
    await markJobCompleted(job.id)
    return { outcome: 'completed' }
  }

  try {
    const transcript = await fetchTranscriptFromZoom(job.focus_id)

    if (!transcript) {
      const result = await markJobRetryOrFailed(
        job,
        'Transcript not available yet'
      )
      return {
        outcome: result,
        error: 'Transcript not available yet',
      }
    }

    await generateAndSaveFocusSummary(job.focus_id, transcript, true)
    await markJobCompleted(job.id)
    return { outcome: 'completed' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const result = await markJobRetryOrFailed(job, message)
    return { outcome: result, error: message }
  }
}

/**
 * Claim and process pending focus summary jobs (for cron).
 */
export async function processPendingFocusSummaryJobs(limit = BATCH_SIZE): Promise<{
  processed: number
  completed: number
  retried: number
  failed: number
  skipped: number
  job_ids: string[]
}> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const { data: pendingJobs, error } = await supabase
    .from('focus_summary_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to list pending summary jobs: ${error.message}`)
  }

  const stats = {
    processed: 0,
    completed: 0,
    retried: 0,
    failed: 0,
    skipped: 0,
    job_ids: [] as string[],
  }

  for (const job of pendingJobs ?? []) {
    const { data: locked, error: lockError } = await supabase
      .from('focus_summary_jobs')
      .update({
        status: 'processing',
        locked_at: now,
        updated_at: now,
      })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle()

    if (lockError || !locked) {
      stats.skipped += 1
      continue
    }

    stats.processed += 1
    stats.job_ids.push(locked.id)

    const result = await processFocusSummaryJob(locked as FocusSummaryJob)

    if (result.outcome === 'completed') {
      stats.completed += 1
    } else if (result.outcome === 'retry') {
      stats.retried += 1
    } else if (result.outcome === 'failed') {
      stats.failed += 1
    } else {
      stats.skipped += 1
    }
  }

  return stats
}
