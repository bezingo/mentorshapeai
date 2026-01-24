import { NextResponse, NextRequest } from 'next/server'
import { runWeeklyProgressAnalysis } from '@/lib/ai/progress-tracker'

/**
 * GET /api/cron/progress-analysis
 * Weekly progress analysis cron job endpoint
 * 
 * This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions)
 * to run weekly progress analysis for all active collaborations.
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * Recommended schedule: Once per week (e.g., every Sunday at midnight UTC)
 * Vercel cron expression: 0 0 * * 0
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Allow bypass in development
    const isDev = process.env.NODE_ENV === 'development'
    
    if (!isDev && cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized cron request attempted')
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } },
          { status: 401 }
        )
      }
    }

    console.log('Starting weekly progress analysis cron job...')
    const startTime = Date.now()

    // Run the weekly progress analysis
    const { analyzed, failed } = await runWeeklyProgressAnalysis()

    const duration = Date.now() - startTime

    console.log(
      `Weekly progress analysis completed in ${duration}ms. ` +
      `Analyzed: ${analyzed.length}, Failed: ${failed.length}`
    )

    // Log any failures for debugging
    if (failed.length > 0) {
      console.error('Failed analyses:', failed)
    }

    return NextResponse.json({
      data: {
        success: true,
        analyzed_count: analyzed.length,
        failed_count: failed.length,
        analyzed_collaboration_ids: analyzed,
        failed_collaborations: failed,
        duration_ms: duration,
        executed_at: new Date().toISOString(),
      },
    })
  } catch (error: unknown) {
    console.error('Error in cron progress-analysis:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'CRON_JOB_FAILED',
          message: error instanceof Error ? error.message : 'Weekly progress analysis cron job failed',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/progress-analysis
 * Alternative method for triggering the cron job
 * Some cron services prefer POST requests
 */
export async function POST(request: NextRequest) {
  // Delegate to GET handler
  return GET(request)
}
