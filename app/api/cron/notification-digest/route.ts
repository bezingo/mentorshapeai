import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildNotificationEmailHtml, sendNotificationEmail } from '@/lib/notifications/email'

/**
 * GET /api/cron/notification-digest
 * Stub daily digest: emails users with unread in-app notifications (when Resend is configured).
 *
 * Security: Bearer CRON_SECRET (same pattern as progress-analysis cron).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } },
          { status: 401 }
        )
      }
    }

    const supabase = createServiceClient()

    const { data: unreadRows, error } = await supabase
      .from('notifications')
      .select('profile_id')
      .is('read_at', null)

    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    const profileIds = [...new Set((unreadRows ?? []).map((row) => row.profile_id))]
    let emailed = 0
    let skipped = 0

    for (const profileId of profileIds) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, users!inner(email)')
        .eq('id', profileId)
        .single()

      const users = profile?.users as { email: string } | { email: string }[] | undefined
      const user = Array.isArray(users) ? users[0] : users
      const email = user?.email

      if (!email) {
        skipped += 1
        continue
      }

      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .is('read_at', null)

      const unreadCount = count ?? 0
      if (unreadCount === 0) {
        skipped += 1
        continue
      }

      const html = buildNotificationEmailHtml({
        title: 'Your Mentorshape daily digest',
        message: `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'} in your dashboard.`,
        actionUrl: '/dashboard',
      })

      const result = await sendNotificationEmail({
        to: email,
        subject: `Mentorshape digest: ${unreadCount} unread`,
        html,
      })

      if (result.sent) {
        emailed += 1
      } else {
        skipped += 1
      }
    }

    return NextResponse.json({
      data: {
        success: true,
        profiles_with_unread: profileIds.length,
        digest_emails_sent: emailed,
        skipped,
        executed_at: new Date().toISOString(),
        note:
          'Digest stub — does not batch per-user preferences or enforce email rate limits yet.',
      },
    })
  } catch (error: unknown) {
    console.error('Error in cron notification-digest:', error)
    return NextResponse.json(
      {
        error: {
          code: 'CRON_JOB_FAILED',
          message:
            error instanceof Error ? error.message : 'Notification digest cron failed',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
