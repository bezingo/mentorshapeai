import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendDigestEmail } from '@/lib/email'

/**
 * GET /api/cron/digest
 * Daily digest email cron job endpoint
 * 
 * Sends personalized digest emails to users with:
 * - Due tasks from collaborations
 * - Upcoming sessions
 * - Pending collaboration requests
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * Schedule: Daily at 6 AM UTC (vercel.json: 0 6 * * *)
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
        console.warn('Unauthorized cron request attempted for digest')
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } },
          { status: 401 }
        )
      }
    }

    console.log('Starting daily digest cron job...')
    const startTime = Date.now()

    const supabase = createServiceClient()

    // Get all active profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    const results = {
      sent: [] as string[],
      skipped: [] as string[],
      failed: [] as { profileId: string; error: string }[],
    }

    // Send digest to each profile (sendDigestEmail handles all data fetching)
    for (const profile of profiles || []) {
      try {
        const result = await sendDigestEmail(profile.id)
        
        if (result.skipped) {
          results.skipped.push(profile.id)
        } else if (result.success) {
          results.sent.push(profile.id)
        } else {
          results.failed.push({
            profileId: profile.id,
            error: result.error || 'Unknown error',
          })
        }
      } catch (err) {
        console.error(`Failed to process digest for ${profile.id}:`, err)
        results.failed.push({
          profileId: profile.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const duration = Date.now() - startTime

    console.log(
      `Daily digest completed in ${duration}ms. ` +
      `Sent: ${results.sent.length}, Skipped: ${results.skipped.length}, Failed: ${results.failed.length}`
    )

    return NextResponse.json({
      data: {
        success: true,
        sent_count: results.sent.length,
        skipped_count: results.skipped.length,
        failed_count: results.failed.length,
        duration_ms: duration,
        executed_at: new Date().toISOString(),
      },
    })
  } catch (error: unknown) {
    console.error('Error in cron digest:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'CRON_JOB_FAILED',
          message: error instanceof Error ? error.message : 'Daily digest cron job failed',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/digest
 * Alternative method for triggering the cron job
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
