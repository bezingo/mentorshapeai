export type OutreachChannel = 'linkedin' | 'email'

export interface OutreachDraftInput {
  menteeName: string
  mentorName: string
  mentorHeadline?: string | null
  sharedHighlights?: string[]
  goalTitle?: string | null
  publicProfileUrl?: string | null
}

export interface OutreachDraft {
  channel: OutreachChannel
  subject?: string
  body: string
  /** Stored server-side; user must confirm before any send integration */
  requires_user_confirmation: true
  created_at: string
}

const OUTREACH_DRAFT_STORE = new Map<string, OutreachDraft>()

function draftId(channel: OutreachChannel, menteeName: string, mentorName: string): string {
  return `${channel}:${menteeName}:${mentorName}:${Date.now()}`
}

export function buildLinkedInOutreachDraft(input: OutreachDraftInput): OutreachDraft {
  const highlights =
    input.sharedHighlights && input.sharedHighlights.length > 0
      ? `\n\nI noticed we might connect well — ${input.sharedHighlights.slice(0, 2).join('; ')}.`
      : ''

  const goalLine = input.goalTitle
    ? ` I'm working toward "${input.goalTitle}" and would value your perspective.`
    : " I'm exploring mentorship on Mentorshape and thought we might be a good fit."

  const body = `Hi ${input.mentorName},

I'm ${input.menteeName}. I came across your profile on Mentorshape${input.mentorHeadline ? ` (${input.mentorHeadline})` : ''}.${goalLine}${highlights}

Would you be open to a brief intro chat? I'm happy to work around your schedule.

Thanks,
${input.menteeName}`

  const draft: OutreachDraft = {
    channel: 'linkedin',
    body,
    requires_user_confirmation: true,
    created_at: new Date().toISOString(),
  }

  OUTREACH_DRAFT_STORE.set(draftId('linkedin', input.menteeName, input.mentorName), draft)
  return draft
}

export function buildEmailOutreachDraft(input: OutreachDraftInput): OutreachDraft {
  const highlights =
    input.sharedHighlights && input.sharedHighlights.length > 0
      ? ` ${input.sharedHighlights[0]}`
      : ''

  const subject = `Mentorship intro — ${input.menteeName} via Mentorshape`

  const body = `Hello ${input.mentorName},

My name is ${input.menteeName}. I found your Mentorshape profile and would like to explore a mentoring conversation.${highlights}

${input.goalTitle ? `Current focus: ${input.goalTitle}\n\n` : ''}${
    input.publicProfileUrl ? `My one-link profile: ${input.publicProfileUrl}\n\n` : ''
  }If you're available, I'd appreciate 20–30 minutes for an introduction. Please suggest a time that works for you.

Best regards,
${input.menteeName}`

  const draft: OutreachDraft = {
    channel: 'email',
    subject,
    body,
    requires_user_confirmation: true,
    created_at: new Date().toISOString(),
  }

  OUTREACH_DRAFT_STORE.set(draftId('email', input.menteeName, input.mentorName), draft)
  return draft
}

export function buildOutreachDrafts(input: OutreachDraftInput): {
  linkedin: OutreachDraft
  email: OutreachDraft
} {
  return {
    linkedin: buildLinkedInOutreachDraft(input),
    email: buildEmailOutreachDraft(input),
  }
}

/** In-memory store for drafts in this process (no auto-send). */
export function listStoredOutreachDrafts(): OutreachDraft[] {
  return [...OUTREACH_DRAFT_STORE.values()]
}
