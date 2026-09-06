/**
 * Email sending functions for Mentorshape M1
 * 
 * These functions handle the business logic for sending various email types.
 * They fetch required data from the database and use the templates.
 */

import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail, isEmailConfigured, type EmailResult } from './client'
import {
  digestEmailTemplate,
  sessionReminderTemplate,
  collabRequestTemplate,
  type DigestEmailData,
  type SessionReminderData,
  type CollabRequestData,
} from './templates'

/**
 * Send a digest email to a user
 * Includes due tasks, next focus, and pending collaboration requests
 */
export async function sendDigestEmail(profileId: string): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    console.log('[Email] Skipping digest - not configured')
    return { success: true, skipped: true }
  }

  const supabase = createServiceClient()

  // Fetch profile and email
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      user:users!profiles_user_id_fkey(email)
    `)
    .eq('id', profileId)
    .single()

  if (!profile || !profile.user) {
    return { success: false, error: 'Profile or email not found' }
  }

  const user = Array.isArray(profile.user) ? profile.user[0] : profile.user
  if (!user?.email) {
    return { success: false, error: 'Email not found' }
  }

  // Fetch due action items (due within 7 days)
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const { data: actionItems } = await supabase
    .from('action_items')
    .select(`
      id,
      title,
      due_date,
      collaboration:collaborations!action_items_collaboration_id_fkey(
        goal:goals!collaborations_goal_id_fkey(title)
      )
    `)
    .eq('assignee_profile_id', profileId)
    .eq('status', 'pending')
    .lte('due_date', sevenDaysFromNow.toISOString().split('T')[0])
    .order('due_date', { ascending: true })

  // Fetch next scheduled focus
  const now = new Date().toISOString()
  const { data: nextFocus } = await supabase
    .from('focuses')
    .select(`
      id,
      scheduled_at,
      collaboration:collaborations!focuses_collaboration_id_fkey(
        mentor_profile_id,
        mentee_profile_id,
        goal:goals!collaborations_goal_id_fkey(title),
        mentor_profile:profiles!collaborations_mentor_profile_id_fkey(display_name),
        mentee_profile:profiles!collaborations_mentee_profile_id_fkey(display_name)
      )
    `)
    .eq('status', 'scheduled')
    .gte('scheduled_at', now)
    .or(`collaboration.mentor_profile_id.eq.${profileId},collaboration.mentee_profile_id.eq.${profileId}`)
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .single()

  // Fetch pending collaboration requests (for mentors)
  const { data: pendingRequests } = await supabase
    .from('collaborations')
    .select(`
      id,
      created_at,
      goal:goals!collaborations_goal_id_fkey(title),
      mentee_profile:profiles!collaborations_mentee_profile_id_fkey(display_name)
    `)
    .eq('mentor_profile_id', profileId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Build email data
  const dueTasks = (actionItems || []).map((item) => {
    const collab = Array.isArray(item.collaboration) ? item.collaboration[0] : item.collaboration
    const goal = collab?.goal
    const goalData = Array.isArray(goal) ? goal[0] : goal
    return {
      title: item.title,
      dueDate: item.due_date!,
      collaborationTitle: goalData?.title || 'Untitled Goal',
    }
  })

  let nextFocusData: DigestEmailData['nextFocus'] = null
  if (nextFocus?.collaboration) {
    const collab = Array.isArray(nextFocus.collaboration) ? nextFocus.collaboration[0] : nextFocus.collaboration
    const goal = Array.isArray(collab.goal) ? collab.goal[0] : collab.goal
    const mentor = Array.isArray(collab.mentor_profile) ? collab.mentor_profile[0] : collab.mentor_profile
    const mentee = Array.isArray(collab.mentee_profile) ? collab.mentee_profile[0] : collab.mentee_profile
    
    const isMentor = collab.mentor_profile_id === profileId
    nextFocusData = {
      scheduledAt: nextFocus.scheduled_at,
      mentorName: isMentor ? undefined : mentor?.display_name,
      menteeName: isMentor ? mentee?.display_name : undefined,
      goalTitle: goal?.title || 'Untitled Goal',
    }
  }

  const pendingRequestsData = (pendingRequests || []).map((req) => {
    const goal = Array.isArray(req.goal) ? req.goal[0] : req.goal
    const mentee = Array.isArray(req.mentee_profile) ? req.mentee_profile[0] : req.mentee_profile
    return {
      requesterName: mentee?.display_name || 'Someone',
      goalTitle: goal?.title || 'Untitled Goal',
      requestedAt: req.created_at,
    }
  })

  const emailData: DigestEmailData = {
    recipientName: profile.display_name || 'there',
    dueTasks,
    nextFocus: nextFocusData,
    pendingRequests: pendingRequestsData,
  }

  // Skip if nothing to report
  if (dueTasks.length === 0 && !nextFocusData && pendingRequestsData.length === 0) {
    console.log('[Email] Skipping digest - nothing to report')
    return { success: true, skipped: true }
  }

  const { subject, html, text } = digestEmailTemplate(emailData)
  return sendEmail({ to: user.email, subject, html, text })
}

/**
 * Send a session reminder email
 */
export async function sendSessionReminder(focusId: string): Promise<{ mentor: EmailResult; mentee: EmailResult }> {
  const results = { mentor: { success: false } as EmailResult, mentee: { success: false } as EmailResult }

  if (!isEmailConfigured()) {
    console.log('[Email] Skipping session reminder - not configured')
    return { mentor: { success: true, skipped: true }, mentee: { success: true, skipped: true } }
  }

  const supabase = createServiceClient()

  const { data: focus } = await supabase
    .from('focuses')
    .select(`
      id,
      scheduled_at,
      duration_minutes,
      meeting_url,
      collaboration:collaborations!focuses_collaboration_id_fkey(
        mentor_profile_id,
        mentee_profile_id,
        goal:goals!collaborations_goal_id_fkey(title),
        mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
          display_name,
          user:users!profiles_user_id_fkey(email)
        ),
        mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
          display_name,
          user:users!profiles_user_id_fkey(email)
        )
      )
    `)
    .eq('id', focusId)
    .single()

  if (!focus?.collaboration) {
    return { mentor: { success: false, error: 'Focus not found' }, mentee: { success: false, error: 'Focus not found' } }
  }

  const collab = Array.isArray(focus.collaboration) ? focus.collaboration[0] : focus.collaboration
  const goal = Array.isArray(collab.goal) ? collab.goal[0] : collab.goal
  const mentor = Array.isArray(collab.mentor_profile) ? collab.mentor_profile[0] : collab.mentor_profile
  const mentee = Array.isArray(collab.mentee_profile) ? collab.mentee_profile[0] : collab.mentee_profile

  const mentorUser = Array.isArray(mentor?.user) ? mentor.user[0] : mentor?.user
  const menteeUser = Array.isArray(mentee?.user) ? mentee.user[0] : mentee?.user

  // Send to mentor
  if (mentorUser?.email) {
    const mentorData: SessionReminderData = {
      recipientName: mentor?.display_name || 'there',
      recipientRole: 'mentor',
      partnerName: mentee?.display_name || 'your mentee',
      goalTitle: goal?.title || 'Untitled Goal',
      scheduledAt: focus.scheduled_at,
      durationMinutes: focus.duration_minutes,
      meetingUrl: focus.meeting_url || undefined,
      focusId: focus.id,
    }
    const { subject, html, text } = sessionReminderTemplate(mentorData)
    results.mentor = await sendEmail({ to: mentorUser.email, subject, html, text })
  }

  // Send to mentee
  if (menteeUser?.email) {
    const menteeData: SessionReminderData = {
      recipientName: mentee?.display_name || 'there',
      recipientRole: 'mentee',
      partnerName: mentor?.display_name || 'your mentor',
      goalTitle: goal?.title || 'Untitled Goal',
      scheduledAt: focus.scheduled_at,
      durationMinutes: focus.duration_minutes,
      meetingUrl: focus.meeting_url || undefined,
      focusId: focus.id,
    }
    const { subject, html, text } = sessionReminderTemplate(menteeData)
    results.mentee = await sendEmail({ to: menteeUser.email, subject, html, text })
  }

  return results
}

/**
 * Send a collaboration request notification to the mentor
 */
export async function sendCollabRequestNotification(collaborationId: string): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    console.log('[Email] Skipping collab request notification - not configured')
    return { success: true, skipped: true }
  }

  const supabase = createServiceClient()

  const { data: collab } = await supabase
    .from('collaborations')
    .select(`
      id,
      request_message,
      goal:goals!collaborations_goal_id_fkey(title, description),
      mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
        display_name,
        user:users!profiles_user_id_fkey(email)
      ),
      mentee_profile:profiles!collaborations_mentee_profile_id_fkey(display_name)
    `)
    .eq('id', collaborationId)
    .single()

  if (!collab) {
    return { success: false, error: 'Collaboration not found' }
  }

  const goal = Array.isArray(collab.goal) ? collab.goal[0] : collab.goal
  const mentor = Array.isArray(collab.mentor_profile) ? collab.mentor_profile[0] : collab.mentor_profile
  const mentee = Array.isArray(collab.mentee_profile) ? collab.mentee_profile[0] : collab.mentee_profile
  const mentorUser = Array.isArray(mentor?.user) ? mentor.user[0] : mentor?.user

  if (!mentorUser?.email) {
    return { success: false, error: 'Mentor email not found' }
  }

  const emailData: CollabRequestData = {
    mentorName: mentor?.display_name || 'there',
    menteeName: mentee?.display_name || 'A mentee',
    goalTitle: goal?.title || 'Untitled Goal',
    goalDescription: goal?.description || undefined,
    requestMessage: collab.request_message || undefined,
    collaborationId: collab.id,
  }

  const { subject, html, text } = collabRequestTemplate(emailData)
  return sendEmail({ to: mentorUser.email, subject, html, text })
}
