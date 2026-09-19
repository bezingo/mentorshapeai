import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { getZoomClient } from '@/lib/zoom/client'
import { downloadZoomTranscript } from '@/lib/zoom/transcript'

/**
 * Schema for key decisions made during the focus
 */
const KeyDecisionSchema = z.object({
  decision: z.string().min(1).max(500),
  context: z.string().min(1).max(300),
  impact: z.enum(['high', 'medium', 'low']),
})

/**
 * Schema for action items extracted from the transcript
 */
const ExtractedActionItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  assignee: z.enum(['mentee', 'mentor']),
  priority: z.enum(['high', 'medium', 'low']),
  suggested_due_days: z.number().int().min(1).max(90).optional(),
})

/**
 * Schema for milestone updates suggested from the discussion
 */
const MilestoneUpdateSchema = z.object({
  milestone_title: z.string().min(1).max(200),
  suggested_status: z.enum(['not_started', 'in_progress', 'completed', 'blocked']),
  notes: z.string().min(1).max(300),
})

/**
 * Schema for the complete focus summary
 */
export const FocusSummarySchema = z.object({
  summary: z.string().min(50).max(2000),
  key_decisions: z.array(KeyDecisionSchema).max(10),
  mentee_action_items: z.array(ExtractedActionItemSchema).max(10),
  mentor_action_items: z.array(ExtractedActionItemSchema).max(5),
  milestone_updates: z.array(MilestoneUpdateSchema).max(10),
  overall_sentiment: z.enum(['positive', 'neutral', 'concerned']),
  session_effectiveness: z.number().int().min(1).max(5),
})

export type FocusSummary = z.infer<typeof FocusSummarySchema>
export type KeyDecision = z.infer<typeof KeyDecisionSchema>
export type ExtractedActionItem = z.infer<typeof ExtractedActionItemSchema>
export type MilestoneUpdate = z.infer<typeof MilestoneUpdateSchema>

/**
 * Input data gathered for transcript summarizer context
 */
export interface TranscriptSummarizerInput {
  focus: {
    id: string
    scheduled_at: string
    duration_minutes: number
    collaboration_id: string
  }
  transcript: string
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
  } | null
  menteeProfileId: string
  mentorProfileId: string
  menteeDisplayName: string
  mentorDisplayName: string
}

/**
 * System prompt for transcript summarizer - optimized for accurate extraction
 */
const systemPrompt = `You are an expert meeting summarizer specializing in mentor-mentee focus sessions.
Your role is to analyze meeting transcripts and extract actionable insights, decisions, and next steps.

Guidelines for creating effective summaries:
1. SUMMARY should capture the key discussion points and outcomes in 2-4 paragraphs
2. KEY DECISIONS should be concrete decisions made during the session
3. ACTION ITEMS should be specific, actionable tasks with clear ownership
4. Distinguish between MENTEE action items (learning, practice, tasks) and MENTOR action items (resources, introductions, reviews)
5. MILESTONE UPDATES should suggest status changes based on discussion content
6. Assign PRIORITY based on urgency and impact discussed
7. suggested_due_days should reflect realistic timeframes mentioned or implied
8. Be accurate - only extract what was actually discussed, don't invent
9. OVERALL_SENTIMENT reflects the tone: positive (progress/excitement), neutral (standard check-in), concerned (blockers/challenges)
10. SESSION_EFFECTIVENESS (1-5) rates how productive the session was based on content depth`

/**
 * User prompt template for generating transcript summary
 */
const userPromptTemplate = `Analyze the following focus session transcript and generate a comprehensive summary.

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

**SESSION AGENDA (if available):**
{agenda_text}

**TRANSCRIPT:**
{transcript}

Generate a summary with:
1. A comprehensive SUMMARY (2-4 paragraphs covering main discussion points)
2. KEY DECISIONS made during the session (if any)
3. MENTEE ACTION ITEMS - tasks for the mentee to complete
4. MENTOR ACTION ITEMS - tasks for the mentor to complete
5. MILESTONE UPDATES - suggested status changes based on discussion
6. OVERALL SENTIMENT of the session
7. SESSION EFFECTIVENESS rating (1-5)

Return ONLY valid JSON with this exact structure:
{{
  "summary": "Comprehensive summary of the focus session...",
  "key_decisions": [
    {{
      "decision": "What was decided",
      "context": "Why this decision was made",
      "impact": "high|medium|low"
    }}
  ],
  "mentee_action_items": [
    {{
      "title": "Action item title",
      "description": "Detailed description of what needs to be done",
      "assignee": "mentee",
      "priority": "high|medium|low",
      "suggested_due_days": 7
    }}
  ],
  "mentor_action_items": [
    {{
      "title": "Action item title",
      "description": "Detailed description of what needs to be done",
      "assignee": "mentor",
      "priority": "high|medium|low",
      "suggested_due_days": 7
    }}
  ],
  "milestone_updates": [
    {{
      "milestone_title": "Milestone that was discussed",
      "suggested_status": "not_started|in_progress|completed|blocked",
      "notes": "Why this status change is suggested"
    }}
  ],
  "overall_sentiment": "positive|neutral|concerned",
  "session_effectiveness": 4
}}

IMPORTANT:
- Only include action items that were actually discussed or implied
- Only suggest milestone updates for milestones that were explicitly discussed
- Be specific in descriptions - avoid generic statements
- If no decisions/items/updates apply, use empty arrays []`

/**
 * Gather all context needed for transcript summarization
 */
export async function gatherTranscriptContext(
  focusId: string,
  transcript: string
): Promise<TranscriptSummarizerInput> {
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

  // Fetch milestones for the goal
  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('id, title, description, status')
    .eq('goal_id', collaboration.goal.id)
    .order('target_date', { ascending: true })

  // Fetch focus agenda if it exists
  const { data: agenda } = await supabase
    .from('focus_agendas')
    .select('topics, questions')
    .eq('focus_id', focusId)
    .single()

  return {
    focus: {
      id: focus.id,
      scheduled_at: focus.scheduled_at,
      duration_minutes: focus.duration_minutes,
      collaboration_id: focus.collaboration_id,
    },
    transcript,
    goal: collaboration.goal,
    milestones: milestones || [],
    agenda: agenda || null,
    menteeProfileId: collaboration.mentee_profile_id,
    mentorProfileId: collaboration.mentor_profile_id,
    menteeDisplayName: collaboration.mentee_profile.display_name,
    mentorDisplayName: collaboration.mentor_profile.display_name,
  }
}

/**
 * Format context data for the prompt
 */
function formatContextForPrompt(input: TranscriptSummarizerInput): Record<string, string | number> {
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
    ? `Topics: ${JSON.stringify(input.agenda.topics, null, 2)}\nQuestions: ${JSON.stringify(input.agenda.questions, null, 2)}`
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
    transcript: input.transcript,
  }
}

/**
 * Generate focus summary using AI
 * 
 * @param focusId - The ID of the focus to summarize
 * @param transcript - The transcript text to summarize
 * @returns Promise resolving to the generated summary
 * @throws Error if AI processing fails or returns invalid data
 * 
 * @example
 * ```typescript
 * const summary = await generateFocusSummary('focus-uuid', 'transcript text...')
 * console.log(summary.summary) // Text summary
 * console.log(summary.mentee_action_items) // Action items for mentee
 * ```
 */
export async function generateFocusSummary(
  focusId: string,
  transcript: string
): Promise<FocusSummary> {
  const openAIApiKey = process.env.OPENAI_API_KEY
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  if (!transcript || transcript.trim().length < 100) {
    throw new Error('Transcript is too short to generate a meaningful summary')
  }

  // Gather context
  const context = await gatherTranscriptContext(focusId, transcript)
  const formattedContext = formatContextForPrompt(context)

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.5, // Lower temperature for more consistent extraction
    openAIApiKey,
    timeout: 60000, // 60 second timeout for long transcripts
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', userPromptTemplate],
  ])

  const parser = new JsonOutputParser<FocusSummary>()
  const chain = prompt.pipe(model).pipe(parser)

  try {
    const result = await chain.invoke(formattedContext)

    // Ensure result is an object, not a string
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result

    // Validate the result against the schema
    const validated = FocusSummarySchema.parse(parsedResult)

    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Transcript Summarizer validation error:', error.errors)
      throw new Error(`Invalid summary data: ${error.errors.map((e) => e.message).join(', ')}`)
    }

    if (
      error instanceof SyntaxError ||
      (error instanceof Error && (error.message.includes('JSON') || error.message.includes('parse')))
    ) {
      console.error('JSON parsing error in Transcript Summarizer:', error)
      throw new Error('Failed to parse summary JSON. The AI response was invalid. Please try again.')
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
      // Re-throw with original message if descriptive
      throw error
    }

    console.error('Error generating focus summary:', error)
    throw new Error(`Failed to generate focus summary: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Save generated summary to database
 */
export async function saveFocusSummary(focusId: string, summary: FocusSummary): Promise<string> {
  const supabase = createServiceClient()

  // Check if summary already exists
  const { data: existing } = await supabase
    .from('focus_summaries')
    .select('id')
    .eq('focus_id', focusId)
    .single()

  if (existing) {
    // Update existing summary
    const { error } = await supabase
      .from('focus_summaries')
      .update({
        summary: summary.summary,
        key_decisions: summary.key_decisions,
        mentee_action_items: summary.mentee_action_items,
        mentor_action_items: summary.mentor_action_items,
        milestone_updates: summary.milestone_updates,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('focus_id', focusId)

    if (error) {
      throw new Error(`Failed to update summary: ${error.message}`)
    }

    return existing.id
  } else {
    // Insert new summary
    const { data, error } = await supabase
      .from('focus_summaries')
      .insert({
        focus_id: focusId,
        summary: summary.summary,
        key_decisions: summary.key_decisions,
        mentee_action_items: summary.mentee_action_items,
        mentor_action_items: summary.mentor_action_items,
        milestone_updates: summary.milestone_updates,
        generated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to save summary: ${error.message}`)
    }

    return data.id
  }
}

/**
 * Create action items in the database from extracted summary items
 */
export async function createActionItemsFromSummary(
  focusId: string,
  collaborationId: string,
  menteeProfileId: string,
  mentorProfileId: string,
  summary: FocusSummary
): Promise<string[]> {
  const supabase = createServiceClient()
  const createdIds: string[] = []

  const allActionItems = [
    ...summary.mentee_action_items.map((item) => ({
      ...item,
      assignee_profile_id: menteeProfileId,
    })),
    ...summary.mentor_action_items.map((item) => ({
      ...item,
      assignee_profile_id: mentorProfileId,
    })),
  ]

  for (const item of allActionItems) {
    // Calculate due date based on suggested_due_days
    const dueDate = item.suggested_due_days
      ? new Date(Date.now() + item.suggested_due_days * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      : null

    const { data, error } = await supabase
      .from('action_items')
      .insert({
        focus_id: focusId,
        collaboration_id: collaborationId,
        assignee_profile_id: item.assignee_profile_id,
        title: item.title,
        description: item.description,
        due_date: dueDate,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      console.error(`Failed to create action item "${item.title}":`, error)
      continue // Continue with other items even if one fails
    }

    createdIds.push(data.id)
  }

  return createdIds
}

/**
 * Generate summary, save it, and create action items in one operation
 */
export async function generateAndSaveFocusSummary(
  focusId: string,
  transcript: string,
  createActionItems: boolean = true
): Promise<{
  summaryId: string
  summary: FocusSummary
  actionItemIds: string[]
}> {
  // Gather context to get profile IDs
  const context = await gatherTranscriptContext(focusId, transcript)

  // Generate the summary
  const summary = await generateFocusSummary(focusId, transcript)

  // Save the summary
  const summaryId = await saveFocusSummary(focusId, summary)

  // Create action items if requested
  let actionItemIds: string[] = []
  if (createActionItems) {
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
 * Fetch transcript from Zoom recording URL
 * This is a placeholder - actual implementation would depend on Zoom API
 */
export async function fetchTranscriptFromZoom(focusId: string): Promise<string | null> {
  const supabase = createServiceClient()

  const { data: focus, error } = await supabase
    .from('focuses')
    .select(
      `
      id,
      transcript_url,
      collaboration:collaborations!focuses_collaboration_id_fkey(
        mentor_profile_id
      )
    `
    )
    .eq('id', focusId)
    .single()

  if (error || !focus?.transcript_url) {
    return null
  }

  const collaboration = Array.isArray(focus.collaboration)
    ? focus.collaboration[0]
    : focus.collaboration

  if (!collaboration?.mentor_profile_id) {
    console.error(`No mentor profile for focus ${focusId}`)
    return null
  }

  const zoomClient = await getZoomClient(collaboration.mentor_profile_id)
  if (!zoomClient) {
    console.error(`No Zoom connection for mentor on focus ${focusId}`)
    return null
  }

  try {
    return await downloadZoomTranscript(zoomClient, focus.transcript_url)
  } catch (err) {
    console.error(`Failed to fetch Zoom transcript for focus ${focusId}:`, err)
    return null
  }
}

/**
 * Auto-generate summary after focus completion
 * This function can be called by webhooks when a Zoom meeting ends
 * 
 * @returns boolean indicating if summary was generated
 */
export async function autoGenerateSummaryAfterFocus(
  focusId: string,
  triggerEvent: 'recording.completed' | 'meeting.ended' | 'manual' = 'manual'
): Promise<boolean> {
  const { enqueueFocusSummaryJob } = await import('@/lib/jobs/focus-summary-jobs')
  const { enqueued } = await enqueueFocusSummaryJob(focusId, triggerEvent)
  return enqueued
}
