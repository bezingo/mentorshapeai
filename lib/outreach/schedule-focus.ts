/**
 * Hook payload for booking a focus session after outreach.
 * Client or agent should call POST /api/collaborations/[id]/focuses with this body.
 */
export interface ScheduleFocusHook {
  collaboration_id: string | null
  book_focus_endpoint: string | null
  suggested_body: {
    scheduled_at: string
    duration_minutes: 30 | 60
  }
  calendar_note: string
}

export function buildScheduleFocusHook(options: {
  collaborationId: string | null
  scheduledAtIso: string
  durationMinutes?: 30 | 60
}): ScheduleFocusHook {
  const duration = options.durationMinutes ?? 60
  return {
    collaboration_id: options.collaborationId,
    book_focus_endpoint: options.collaborationId
      ? `/api/collaborations/${options.collaborationId}/focuses`
      : null,
    suggested_body: {
      scheduled_at: options.scheduledAtIso,
      duration_minutes: duration,
    },
    calendar_note:
      'Use book_focus_endpoint after the mentor accepts. Connect Google Calendar via mentor onboarding for availability.',
  }
}
