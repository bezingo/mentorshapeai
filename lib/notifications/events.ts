import { format } from 'date-fns'
import {
  deliverNotification,
  deliverNotificationToMany,
  notifyInBackground,
} from '@/lib/notifications/service'

function collabUrl(collaborationId: string): string {
  return `/dashboard/collaborations/${collaborationId}`
}

function focusUrl(collaborationId: string, focusId?: string): string {
  const base = `/dashboard/collaborations/${collaborationId}/focuses`
  return focusId ? `${base}?focus=${focusId}` : base
}

function formatSessionTime(scheduledAt: string): string {
  try {
    return format(new Date(scheduledAt), "EEEE, MMM d 'at' h:mm a")
  } catch {
    return scheduledAt
  }
}

export function notifyCollaborationRequested(options: {
  mentorProfileId: string
  menteeName: string
  goalTitle: string
  collaborationId: string
}): void {
  notifyInBackground(
    deliverNotification({
      profileId: options.mentorProfileId,
      type: 'collab_request',
      title: 'New collaboration request',
      message: `${options.menteeName} requested mentorship on "${options.goalTitle}".`,
      actionUrl: collabUrl(options.collaborationId),
      metadata: { collaboration_id: options.collaborationId },
    })
  )
}

export function notifyCollaborationAccepted(options: {
  menteeProfileId: string
  mentorName: string
  goalTitle: string
  collaborationId: string
}): void {
  notifyInBackground(
    deliverNotification({
      profileId: options.menteeProfileId,
      type: 'collab_accepted',
      title: 'Collaboration accepted',
      message: `${options.mentorName} accepted your request for "${options.goalTitle}".`,
      actionUrl: collabUrl(options.collaborationId),
      metadata: { collaboration_id: options.collaborationId },
    })
  )
}

export function notifyCollaborationDeclined(options: {
  menteeProfileId: string
  mentorName: string
  goalTitle: string
  collaborationId: string
}): void {
  notifyInBackground(
    deliverNotification({
      profileId: options.menteeProfileId,
      type: 'collab_declined',
      title: 'Collaboration declined',
      message: `${options.mentorName} declined your request for "${options.goalTitle}".`,
      actionUrl: collabUrl(options.collaborationId),
      metadata: { collaboration_id: options.collaborationId },
    })
  )
}

export function notifyCollaborationCancelled(options: {
  mentorProfileId: string
  menteeProfileId: string
  cancelledByProfileId: string
  goalTitle: string
  collaborationId: string
  reason?: string | null
}): void {
  const recipients = [options.mentorProfileId, options.menteeProfileId].filter(
    (id) => id !== options.cancelledByProfileId
  )

  notifyInBackground(
    deliverNotificationToMany(recipients, (profileId) => ({
      profileId,
      type: 'collab_cancelled',
      title: 'Collaboration cancelled',
      message: options.reason
        ? `A collaboration on "${options.goalTitle}" was cancelled. Reason: ${options.reason}`
        : `A collaboration on "${options.goalTitle}" was cancelled.`,
      actionUrl: collabUrl(options.collaborationId),
      metadata: {
        collaboration_id: options.collaborationId,
        cancelled_by: options.cancelledByProfileId,
      },
    }))
  )
}

export function notifyFocusScheduled(options: {
  mentorProfileId: string
  menteeProfileId: string
  collaborationId: string
  focusId: string
  scheduledAt: string
  bookedByName: string
}): void {
  const when = formatSessionTime(options.scheduledAt)
  const message = `${options.bookedByName} scheduled a focus session for ${when}.`

  notifyInBackground(
    deliverNotificationToMany(
      [options.mentorProfileId, options.menteeProfileId],
      (profileId) => ({
        profileId,
        type: 'session_scheduled',
        title: 'Focus session scheduled',
        message,
        actionUrl: focusUrl(options.collaborationId, options.focusId),
        metadata: {
          collaboration_id: options.collaborationId,
          focus_id: options.focusId,
          scheduled_at: options.scheduledAt,
        },
      })
    )
  )
}

export function notifyFocusRescheduled(options: {
  mentorProfileId: string
  menteeProfileId: string
  collaborationId: string
  focusId: string
  scheduledAt: string
  rescheduledByName: string
}): void {
  const when = formatSessionTime(options.scheduledAt)
  const message = `${options.rescheduledByName} rescheduled a focus session to ${when}.`

  notifyInBackground(
    deliverNotificationToMany(
      [options.mentorProfileId, options.menteeProfileId],
      (profileId) => ({
        profileId,
        type: 'session_scheduled',
        title: 'Focus session rescheduled',
        message,
        actionUrl: focusUrl(options.collaborationId, options.focusId),
        metadata: {
          collaboration_id: options.collaborationId,
          focus_id: options.focusId,
          scheduled_at: options.scheduledAt,
          event: 'rescheduled',
        },
      })
    )
  )
}

export function notifyFocusCancelled(options: {
  mentorProfileId: string
  menteeProfileId: string
  collaborationId: string
  focusId: string
  cancelledByName: string
  reason?: string | null
}): void {
  const message = options.reason
    ? `${options.cancelledByName} cancelled a focus session. Reason: ${options.reason}`
    : `${options.cancelledByName} cancelled a focus session.`

  notifyInBackground(
    deliverNotificationToMany(
      [options.mentorProfileId, options.menteeProfileId],
      (profileId) => ({
        profileId,
        type: 'session_cancelled',
        title: 'Focus session cancelled',
        message,
        actionUrl: focusUrl(options.collaborationId, options.focusId),
        metadata: {
          collaboration_id: options.collaborationId,
          focus_id: options.focusId,
        },
      })
    )
  )
}

export function notifyFocusCompleted(options: {
  mentorProfileId: string
  menteeProfileId: string
  collaborationId: string
  focusId: string
  completedByName: string
}): void {
  const message = `${options.completedByName} marked a focus session as complete.`

  notifyInBackground(
    deliverNotificationToMany(
      [options.mentorProfileId, options.menteeProfileId],
      (profileId) => ({
        profileId,
        type: 'session_completed',
        title: 'Focus session completed',
        message,
        actionUrl: focusUrl(options.collaborationId, options.focusId),
        metadata: {
          collaboration_id: options.collaborationId,
          focus_id: options.focusId,
        },
      })
    )
  )
}
