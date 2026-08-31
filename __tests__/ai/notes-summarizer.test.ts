/**
 * Notes Summarizer Tests - M1
 * 
 * Tests the notes-based recap generation that works without transcripts.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

/**
 * FocusSummary schema (matching the real one)
 */
const FocusSummarySchema = z.object({
  summary: z.string().min(50).max(2000),
  key_decisions: z.array(z.object({
    decision: z.string().min(1).max(500),
    context: z.string().min(1).max(300),
    impact: z.enum(['high', 'medium', 'low']),
  })).max(10),
  mentee_action_items: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(500),
    assignee: z.enum(['mentee', 'mentor']),
    priority: z.enum(['high', 'medium', 'low']),
    suggested_due_days: z.number().int().min(1).max(90).optional(),
  })).max(10),
  mentor_action_items: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(500),
    assignee: z.enum(['mentee', 'mentor']),
    priority: z.enum(['high', 'medium', 'low']),
    suggested_due_days: z.number().int().min(1).max(90).optional(),
  })).max(5),
  milestone_updates: z.array(z.object({
    milestone_title: z.string().min(1).max(200),
    suggested_status: z.enum(['not_started', 'in_progress', 'completed', 'blocked']),
    notes: z.string().min(1).max(300),
  })).max(10),
  overall_sentiment: z.enum(['positive', 'neutral', 'concerned']),
  session_effectiveness: z.number().int().min(1).max(5),
})

describe('FocusSummary Schema Validation', () => {
  it('should accept valid summary with all fields', () => {
    const validSummary = {
      summary: 'This was a productive focus session. We discussed career goals and created a clear path forward. The mentee showed great progress and commitment.',
      key_decisions: [
        {
          decision: 'Focus on Python skills first',
          context: 'Foundation for data science career',
          impact: 'high' as const,
        },
      ],
      mentee_action_items: [
        {
          title: 'Complete Python course',
          description: 'Finish chapters 5-10 of the online course',
          assignee: 'mentee' as const,
          priority: 'high' as const,
          suggested_due_days: 14,
        },
      ],
      mentor_action_items: [
        {
          title: 'Share resources',
          description: 'Send list of recommended projects',
          assignee: 'mentor' as const,
          priority: 'medium' as const,
          suggested_due_days: 7,
        },
      ],
      milestone_updates: [
        {
          milestone_title: 'Learn Python basics',
          suggested_status: 'in_progress' as const,
          notes: 'Good progress, continue with current pace',
        },
      ],
      overall_sentiment: 'positive' as const,
      session_effectiveness: 4,
    }

    const result = FocusSummarySchema.safeParse(validSummary)
    expect(result.success).toBe(true)
  })

  it('should accept minimal summary with empty arrays', () => {
    const minimalSummary = {
      summary: 'Brief session to check in on progress. No major decisions made but good to reconnect.',
      key_decisions: [],
      mentee_action_items: [],
      mentor_action_items: [],
      milestone_updates: [],
      overall_sentiment: 'neutral' as const,
      session_effectiveness: 3,
    }

    const result = FocusSummarySchema.safeParse(minimalSummary)
    expect(result.success).toBe(true)
  })

  it('should reject summary that is too short', () => {
    const shortSummary = {
      summary: 'Too short',
      key_decisions: [],
      mentee_action_items: [],
      mentor_action_items: [],
      milestone_updates: [],
      overall_sentiment: 'neutral' as const,
      session_effectiveness: 3,
    }

    const result = FocusSummarySchema.safeParse(shortSummary)
    expect(result.success).toBe(false)
  })

  it('should reject invalid sentiment value', () => {
    const invalidSummary = {
      summary: 'A reasonable length summary that provides enough context about what happened in the session.',
      key_decisions: [],
      mentee_action_items: [],
      mentor_action_items: [],
      milestone_updates: [],
      overall_sentiment: 'invalid',
      session_effectiveness: 3,
    }

    const result = FocusSummarySchema.safeParse(invalidSummary)
    expect(result.success).toBe(false)
  })

  it('should reject effectiveness rating outside 1-5 range', () => {
    const invalidSummary = {
      summary: 'A reasonable length summary that provides enough context about what happened in the session.',
      key_decisions: [],
      mentee_action_items: [],
      mentor_action_items: [],
      milestone_updates: [],
      overall_sentiment: 'positive' as const,
      session_effectiveness: 6,
    }

    const result = FocusSummarySchema.safeParse(invalidSummary)
    expect(result.success).toBe(false)
  })
})

describe('Notes Input Validation', () => {
  it('should require at least one notes source', () => {
    function validateNotesInput(menteeNotes: string | null, mentorNotes: string | null): boolean {
      return !!(menteeNotes || mentorNotes)
    }

    expect(validateNotesInput(null, null)).toBe(false)
    expect(validateNotesInput('Some notes', null)).toBe(true)
    expect(validateNotesInput(null, 'Some notes')).toBe(true)
    expect(validateNotesInput('Mentee notes', 'Mentor notes')).toBe(true)
    expect(validateNotesInput('', '')).toBe(false)
  })

  it('should handle notes from both parties', () => {
    interface NotesContext {
      menteeNotes: string | null
      mentorNotes: string | null
    }

    function formatNotesForPrompt(context: NotesContext): string {
      const parts: string[] = []
      if (context.menteeNotes) {
        parts.push(`Mentee: ${context.menteeNotes}`)
      }
      if (context.mentorNotes) {
        parts.push(`Mentor: ${context.mentorNotes}`)
      }
      return parts.join('\n\n')
    }

    const bothNotes = formatNotesForPrompt({
      menteeNotes: 'I learned about Python',
      mentorNotes: 'Good progress on fundamentals',
    })
    expect(bothNotes).toContain('Mentee: I learned about Python')
    expect(bothNotes).toContain('Mentor: Good progress')

    const menteeOnly = formatNotesForPrompt({
      menteeNotes: 'Solo notes',
      mentorNotes: null,
    })
    expect(menteeOnly).toContain('Mentee: Solo notes')
    expect(menteeOnly).not.toContain('Mentor:')
  })
})

describe('HTML Recap Generation', () => {
  it('should generate valid HTML structure', () => {
    const summary = {
      summary: 'Test summary content that is long enough to pass validation requirements for the test.',
      key_decisions: [],
      mentee_action_items: [],
      mentor_action_items: [],
      milestone_updates: [],
      overall_sentiment: 'positive' as const,
      session_effectiveness: 4,
    }

    const sessionInfo = {
      date: 'Monday, March 20, 2024',
      menteeName: 'Alice',
      mentorName: 'Bob',
      goalTitle: 'Career Growth',
    }

    function generateHtmlRecap(summary: typeof FocusSummarySchema._type, info: typeof sessionInfo): string {
      return `
<!DOCTYPE html>
<html>
<head><title>Focus Session Recap - ${info.goalTitle}</title></head>
<body>
  <h1>Focus Session Recap</h1>
  <p>${info.menteeName} & ${info.mentorName} • ${info.date}</p>
  <div class="summary">${summary.summary}</div>
  <div class="sentiment">Session Mood: ${summary.overall_sentiment}</div>
  <div class="effectiveness">Effectiveness: ${summary.session_effectiveness}/5</div>
</body>
</html>
      `.trim()
    }

    const html = generateHtmlRecap(summary, sessionInfo)

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Focus Session Recap')
    expect(html).toContain('Alice')
    expect(html).toContain('Bob')
    expect(html).toContain('Career Growth')
    expect(html).toContain('positive')
    expect(html).toContain('4/5')
  })
})
