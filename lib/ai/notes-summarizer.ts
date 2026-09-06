import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import {
  FocusSummarySchema,
  type FocusSummary,
  saveFocusSummary,
  createActionItemsFromSummary,
} from './transcript-summarizer'

/**
 * Input data for notes-based summarization
 */
export interface NotesInput {
  focus: {
    id: string
    scheduled_at: string
    duration_minutes: number
    collaboration_id: string
  }
  menteeNotes: string | null
  mentorNotes: string | null
  goal: {
    id: string
    title: string
    description: string | null
    success_definition: string | null
  }
  milestones: Array<{
    id: string
    title: string
    description: string | null
    status: string
  }>
  agenda: {
    topics: unknown[]
    questions: unknown[]
    previous_action_items: unknown[]
  } | null
  menteeProfileId: string
  mentorProfileId: string
  menteeDisplayName: string
  mentorDisplayName: string
}

/**
 * System prompt for notes-based summarizer
 */
const systemPrompt = `You are an expert at creating focus session recaps from meeting notes.
You are given the notes that the mentee and/or mentor took during or after a focus session.
Your role is to synthesize these notes into a comprehensive session recap.

Guidelines:
1. SUMMARY should capture the key points from the notes in 1-3 paragraphs
2. Extract any KEY DECISIONS that were mentioned or implied in the notes
3. Extract ACTION ITEMS - look for tasks, to-dos, follow-ups mentioned in notes
4. Assign items to MENTEE or MENTOR based on context
5. Look for MILESTONE UPDATES - any progress mentioned on existing milestones
6. Infer SENTIMENT from the tone and content of notes
7. Rate SESSION EFFECTIVENESS based on how substantive the notes are
8. Be accurate - only extract what is in the notes, don't invent
9. If only one party's notes are available, work with what you have
10. If notes are sparse, still create a useful recap from the available information`

/**
 * User prompt template for notes-based summary
 */
const userPromptTemplate = `Create a focus session recap from the following notes.

**SESSION INFO:**
- Duration: {duration_minutes} minutes
- Date: {session_date}
- Mentee: {mentee_name}
- Mentor: {mentor_name}

**GOAL CONTEXT:**
- Goal: {goal_title}
- Description: {goal_description}
- Success Definition: {success_definition}

**CURRENT MILESTONES:**
{milestones_text}

**SESSION AGENDA (if prepared):**
{agenda_text}

**MENTEE'S NOTES:**
{mentee_notes}

**MENTOR'S NOTES:**
{mentor_notes}

Generate a recap with:
1. A SUMMARY of the session based on the notes (1-3 paragraphs)
2. KEY DECISIONS mentioned or implied
3. MENTEE ACTION ITEMS - tasks for the mentee
4. MENTOR ACTION ITEMS - tasks for the mentor
5. MILESTONE UPDATES - any progress mentioned
6. OVERALL SENTIMENT based on the notes
7. SESSION EFFECTIVENESS rating (1-5)

Return ONLY valid JSON with this exact structure:
{{
  "summary": "Recap of the focus session based on notes...",
  "key_decisions": [
    {{
      "decision": "What was decided",
      "context": "Context from the notes",
      "impact": "high|medium|low"
    }}
  ],
  "mentee_action_items": [
    {{
      "title": "Action item title",
      "description": "What needs to be done",
      "assignee": "mentee",
      "priority": "high|medium|low",
      "suggested_due_days": 7
    }}
  ],
  "mentor_action_items": [
    {{
      "title": "Action item title",
      "description": "What needs to be done",
      "assignee": "mentor",
      "priority": "high|medium|low",
      "suggested_due_days": 7
    }}
  ],
  "milestone_updates": [
    {{
      "milestone_title": "Milestone discussed",
      "suggested_status": "not_started|in_progress|completed|blocked",
      "notes": "Progress or status from notes"
    }}
  ],
  "overall_sentiment": "positive|neutral|concerned",
  "session_effectiveness": 3
}}

IMPORTANT:
- Work with whatever notes are available (one side or both)
- If notes are minimal, create a brief but accurate recap
- Only include items that are clearly in the notes
- Use empty arrays [] if nothing applies`

/**
 * Gather context from notes (agenda notes) for summarization
 */
export async function gatherNotesContext(focusId: string): Promise<NotesInput> {
  const supabase = createServiceClient()

  // Fetch focus with collaboration and goal details
  const { data: focus, error: focusError } = await supabase
    .from('focuses')
    .select(`
      id,
      scheduled_at,
      duration_minutes,
      collaboration_id,
      collaboration:collaborations!focuses_collaboration_id_fkey(
        id,
        mentor_profile_id,
        mentee_profile_id,
        goal:goals!collaborations_goal_id_fkey(
          id,
          title,
          description,
          success_definition
        ),
        mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
          id,
          display_name
        ),
        mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
          id,
          display_name
        )
      )
    `)
    .eq('id', focusId)
    .single()

  if (focusError || !focus) {
    throw new Error(`Focus not found: ${focusError?.message || 'Unknown error'}`)
  }

  const rawCollaboration = Array.isArray(focus.collaboration) ? focus.collaboration[0] : focus.collaboration
  
  if (!rawCollaboration) {
    throw new Error('Collaboration not found')
  }

  const collaboration = {
    id: rawCollaboration.id,
    mentor_profile_id: rawCollaboration.mentor_profile_id,
    mentee_profile_id: rawCollaboration.mentee_profile_id,
    goal: Array.isArray(rawCollaboration.goal) ? rawCollaboration.goal[0] : rawCollaboration.goal,
    mentor_profile: Array.isArray(rawCollaboration.mentor_profile) ? rawCollaboration.mentor_profile[0] : rawCollaboration.mentor_profile,
    mentee_profile: Array.isArray(rawCollaboration.mentee_profile) ? rawCollaboration.mentee_profile[0] : rawCollaboration.mentee_profile,
  }

  if (!collaboration?.goal) {
    throw new Error('Goal not found')
  }

  // Fetch milestones
  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('id, title, description, status')
    .eq('goal_id', collaboration.goal.id)
    .order('target_date', { ascending: true })

  // Fetch focus agenda with notes
  const { data: agenda } = await supabase
    .from('focus_agendas')
    .select('topics, questions, previous_action_items, mentee_notes, mentor_notes')
    .eq('focus_id', focusId)
    .single()

  return {
    focus: {
      id: focus.id,
      scheduled_at: focus.scheduled_at,
      duration_minutes: focus.duration_minutes,
      collaboration_id: focus.collaboration_id,
    },
    menteeNotes: agenda?.mentee_notes || null,
    mentorNotes: agenda?.mentor_notes || null,
    goal: collaboration.goal,
    milestones: milestones || [],
    agenda: agenda ? {
      topics: agenda.topics,
      questions: agenda.questions,
      previous_action_items: agenda.previous_action_items,
    } : null,
    menteeProfileId: collaboration.mentee_profile_id,
    mentorProfileId: collaboration.mentor_profile_id,
    menteeDisplayName: collaboration.mentee_profile.display_name,
    mentorDisplayName: collaboration.mentor_profile.display_name,
  }
}

/**
 * Format context for the prompt
 */
function formatNotesContextForPrompt(input: NotesInput): Record<string, string | number> {
  // Format milestones
  const milestonesText = input.milestones.length > 0
    ? input.milestones
        .map((m) => {
          const statusEmoji = m.status === 'completed' ? '✅' : m.status === 'in_progress' ? '🔄' : '⏳'
          return `- ${statusEmoji} ${m.title} (${m.status})`
        })
        .join('\n')
    : 'No milestones defined yet'

  // Format agenda
  const agendaText = input.agenda
    ? `Topics: ${JSON.stringify(input.agenda.topics, null, 2)}`
    : 'No agenda was prepared for this session'

  return {
    duration_minutes: input.focus.duration_minutes,
    session_date: new Date(input.focus.scheduled_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    mentee_name: input.menteeDisplayName,
    mentor_name: input.mentorDisplayName,
    goal_title: input.goal.title,
    goal_description: input.goal.description || 'No description provided',
    success_definition: input.goal.success_definition || 'Not yet defined',
    milestones_text: milestonesText,
    agenda_text: agendaText,
    mentee_notes: input.menteeNotes || 'No notes provided by mentee',
    mentor_notes: input.mentorNotes || 'No notes provided by mentor',
  }
}

/**
 * Generate focus summary from notes (without transcript)
 * 
 * @param focusId - The ID of the focus to summarize
 * @param menteeNotes - Optional override for mentee notes
 * @param mentorNotes - Optional override for mentor notes
 * @returns Promise resolving to the generated summary
 */
export async function generateSummaryFromNotes(
  focusId: string,
  menteeNotes?: string,
  mentorNotes?: string
): Promise<FocusSummary> {
  const openAIApiKey = process.env.OPENAI_API_KEY
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  // Gather context
  const context = await gatherNotesContext(focusId)
  
  // Override notes if provided
  if (menteeNotes !== undefined) {
    context.menteeNotes = menteeNotes || null
  }
  if (mentorNotes !== undefined) {
    context.mentorNotes = mentorNotes || null
  }

  // Check that at least some notes exist
  if (!context.menteeNotes && !context.mentorNotes) {
    throw new Error('At least one party must provide notes to generate a recap')
  }

  const formattedContext = formatNotesContextForPrompt(context)

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.5,
    openAIApiKey,
    timeout: 45000,
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', userPromptTemplate],
  ])

  const parser = new JsonOutputParser<FocusSummary>()
  const chain = prompt.pipe(model).pipe(parser)

  try {
    const result = await chain.invoke(formattedContext)
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result
    return FocusSummarySchema.parse(parsedResult)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Notes Summarizer validation error:', error.errors)
      throw new Error(`Invalid summary data: ${error.errors.map((e) => e.message).join(', ')}`)
    }

    if (
      error instanceof SyntaxError ||
      (error instanceof Error && (error.message.includes('JSON') || error.message.includes('parse')))
    ) {
      console.error('JSON parsing error in Notes Summarizer:', error)
      throw new Error('Failed to parse summary JSON. Please try again.')
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('Summary generation timed out. Please try again.')
      }
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('OpenAI API key is invalid or expired')
      }
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.')
      }
      throw error
    }

    throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate and save summary from notes in one operation
 */
export async function generateAndSaveSummaryFromNotes(
  focusId: string,
  menteeNotes?: string,
  mentorNotes?: string,
  createActionItems: boolean = true
): Promise<{
  summaryId: string
  summary: FocusSummary
  actionItemIds: string[]
}> {
  // Generate the summary from notes
  const summary = await generateSummaryFromNotes(focusId, menteeNotes, mentorNotes)

  // Save the summary
  const summaryId = await saveFocusSummary(focusId, summary)

  // Create action items if requested
  let actionItemIds: string[] = []
  if (createActionItems) {
    const context = await gatherNotesContext(focusId)
    actionItemIds = await createActionItemsFromSummary(
      focusId,
      context.focus.collaboration_id,
      context.menteeProfileId,
      context.mentorProfileId,
      summary
    )
  }

  return { summaryId, summary, actionItemIds }
}

/**
 * Generate HTML recap from notes
 */
export function generateHtmlRecap(summary: FocusSummary, sessionInfo: {
  date: string
  menteeName: string
  mentorName: string
  goalTitle: string
}): string {
  const { date, menteeName, mentorName, goalTitle } = sessionInfo

  const sentimentEmoji = {
    positive: '😊',
    neutral: '😐',
    concerned: '😟',
  }[summary.overall_sentiment]

  const effectivenessStars = '⭐'.repeat(summary.session_effectiveness)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Focus Session Recap - ${goalTitle}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1a1a1a; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; color: #374151; }
    .meta { color: #6b7280; margin-bottom: 24px; }
    .summary { background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px; line-height: 1.6; }
    .section { margin-bottom: 20px; }
    .item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .item:last-child { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px; }
    .badge-high { background: #fee2e2; color: #b91c1c; }
    .badge-medium { background: #fef3c7; color: #b45309; }
    .badge-low { background: #e0e7ff; color: #4338ca; }
    .assignee { color: #6b7280; font-size: 14px; }
    .stats { display: flex; gap: 24px; margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; }
    .stat-label { color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Focus Session Recap</h1>
  <div class="meta">
    <p><strong>${goalTitle}</strong></p>
    <p>${menteeName} & ${mentorName} • ${date}</p>
  </div>

  <div class="summary">
    ${summary.summary.split('\n\n').map(p => `<p>${p}</p>`).join('')}
  </div>

  ${summary.key_decisions.length > 0 ? `
  <h2>Key Decisions</h2>
  <div class="section">
    ${summary.key_decisions.map(d => `
      <div class="item">
        <strong>${d.decision}</strong>
        <span class="badge badge-${d.impact}">${d.impact}</span>
        <p class="assignee">${d.context}</p>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${summary.mentee_action_items.length > 0 ? `
  <h2>Action Items for ${menteeName}</h2>
  <div class="section">
    ${summary.mentee_action_items.map(item => `
      <div class="item">
        <strong>${item.title}</strong>
        <span class="badge badge-${item.priority}">${item.priority}</span>
        <p class="assignee">${item.description}</p>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${summary.mentor_action_items.length > 0 ? `
  <h2>Action Items for ${mentorName}</h2>
  <div class="section">
    ${summary.mentor_action_items.map(item => `
      <div class="item">
        <strong>${item.title}</strong>
        <span class="badge badge-${item.priority}">${item.priority}</span>
        <p class="assignee">${item.description}</p>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${summary.milestone_updates.length > 0 ? `
  <h2>Milestone Updates</h2>
  <div class="section">
    ${summary.milestone_updates.map(m => `
      <div class="item">
        <strong>${m.milestone_title}</strong> → ${m.suggested_status}
        <p class="assignee">${m.notes}</p>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${sentimentEmoji}</div>
      <div class="stat-label">Session Mood</div>
    </div>
    <div class="stat">
      <div class="stat-value">${effectivenessStars}</div>
      <div class="stat-label">Effectiveness</div>
    </div>
    <div class="stat">
      <div class="stat-value">${summary.mentee_action_items.length + summary.mentor_action_items.length}</div>
      <div class="stat-label">Action Items</div>
    </div>
  </div>
</body>
</html>
  `.trim()
}
