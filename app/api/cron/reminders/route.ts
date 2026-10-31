import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email/client'
import { sessionReminderTemplate } from '@/lib/email/templates'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isDev = process.env.NODE_ENV === 'development'
    
    if (!isDev && cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    console.log('Starting reminders cron job...')
    const startTime = Date.now()
    const supabase = createServiceClient()

    const { data: reminders, error } = await supabase
      .rpc('get_pending_reminders', { p_limit: 100 })

    if (error) {
      console.error('Error fetching reminders:', error)
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
    }

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0
    }

    for (const reminder of reminders || []) {
      try {
        if (reminder.reminder_type === 'session_upcoming') {
          const { data: focus } = await supabase
            .from('focuses')
            .select(`
              id, scheduled_at, duration_minutes, meeting_url,
              collaboration:collaborations!inner(
                id,
                mentor_profile:profiles!collaborations_mentor_profile_id_fkey(id, display_name),
                mentee_profile:profiles!collaborations_mentee_profile_id_fkey(id, display_name),
                goal:goals!inner(title)
              )
            `)
            .eq('id', reminder.reference_id)
            .single()

          if (!focus) {
            await supabase.rpc('mark_reminder_sent', { 
              p_reminder_id: reminder.id, 
              p_success: false,
              p_error_message: 'Focus not found'
            })
            results.failed++
            continue
          }

          const collab = focus.collaboration as unknown as {
            id: string
            mentor_profile: { id: string; display_name: string | null }
            mentee_profile: { id: string; display_name: string | null }
            goal: { title: string }
          }

          const isMentor = collab.mentor_profile.id === reminder.profile_id
          const recipientName = isMentor 
            ? collab.mentor_profile.display_name 
            : collab.mentee_profile.display_name
          const partnerName = isMentor 
            ? collab.mentee_profile.display_name 
            : collab.mentor_profile.display_name

          const emailData = sessionReminderTemplate({
            recipientName: recipientName || 'there',
            recipientRole: isMentor ? 'mentor' : 'mentee',
            partnerName: partnerName || 'your partner',
            goalTitle: collab.goal.title,
            scheduledAt: focus.scheduled_at,
            durationMinutes: focus.duration_minutes,
            meetingUrl: focus.meeting_url || undefined,
            focusId: focus.id
          })

          const emailResult = await sendEmail({
            to: reminder.profile_email,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text
          })

          await supabase.rpc('mark_reminder_sent', { 
            p_reminder_id: reminder.id, 
            p_success: emailResult.success,
            p_error_message: emailResult.success ? null : (emailResult.error || 'Email failed')
          })

          if (emailResult.success) {
            results.sent++
          } else {
            results.failed++
          }
        } else {
          results.skipped++
        }
      } catch (err) {
        console.error(`Failed to process reminder ${reminder.id}:`, err)
        await supabase.rpc('mark_reminder_sent', { 
          p_reminder_id: reminder.id, 
          p_success: false,
          p_error_message: err instanceof Error ? err.message : 'Unknown error'
        })
        results.failed++
      }
    }

    const duration = Date.now() - startTime
    console.log(`Reminders cron completed in ${duration}ms. Sent: ${results.sent}, Failed: ${results.failed}, Skipped: ${results.skipped}`)

    return NextResponse.json({
      data: {
        success: true,
        processed: (reminders || []).length,
        ...results,
        duration_ms: duration,
        executed_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error in reminders cron:', error)
    return NextResponse.json({ error: 'Reminders cron job failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
