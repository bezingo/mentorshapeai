import { NextResponse, NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/cron/verify-cron-auth'
import { processPendingFocusSummaryJobs } from '@/lib/jobs/focus-summary-jobs'

/**
 * GET /api/cron/focus-summary-jobs
 * Processes pending Zoom transcript → AI summary jobs.
 *
 * Recommended schedule: every 5–15 minutes (Vercel Cron or external scheduler).
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request)
  if (authError) {
    return authError
  }

  try {
    const startTime = Date.now()
    const stats = await processPendingFocusSummaryJobs()

    return NextResponse.json({
      data: {
        success: true,
        ...stats,
        duration_ms: Date.now() - startTime,
        executed_at: new Date().toISOString(),
      },
    })
  } catch (error: unknown) {
    console.error('Error in cron focus-summary-jobs:', error)
    return NextResponse.json(
      {
        error: {
          code: 'CRON_JOB_FAILED',
          message:
            error instanceof Error
              ? error.message
              : 'Focus summary jobs cron failed',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
