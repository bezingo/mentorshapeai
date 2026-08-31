/**
 * Email module for Mentorshape
 * 
 * M1 features:
 * - Digest emails (due tasks, next focus, pending requests)
 * - Session reminder emails
 * - Collaboration request notifications
 * 
 * Safe no-op when RESEND_API_KEY is not configured.
 */

export { sendEmail, isEmailConfigured, type EmailResult } from './client'
export {
  digestEmailTemplate,
  sessionReminderTemplate,
  collabRequestTemplate,
  type DigestEmailData,
  type SessionReminderData,
  type CollabRequestData,
} from './templates'
export {
  sendDigestEmail,
  sendSessionReminder,
  sendCollabRequestNotification,
} from './send'
