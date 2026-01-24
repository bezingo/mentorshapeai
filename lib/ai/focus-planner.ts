import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Schema for agenda topics
 */
const AgendaTopicSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  priority: z.enum(['high', 'medium', 'low']),
  estimated_minutes: z.number().int().min(5).max(60),
})

/**
 * Schema for suggested questions
 */
const AgendaQuestionSchema = z.object({
  question: z.string().min(1).max(300),
  context: z.string().min(1).max(300),
})

/**
 * Schema for previous action items review
 */
const PreviousActionItemSchema = z.object({
  title: z.string().min(1).max(200),
  status: z.string().min(1).max(50),
  notes: z.string().max(300),
})

/**
 * Schema for the complete focus agenda
 */
export const FocusAgendaSchema = z.object({
  topics: z.array(AgendaTopicSchema).min(2).max(6),
  questions: z.array(AgendaQuestionSchema).min(3).max(8),
  previous_action_items: z.array(PreviousActionItemSchema).max(10),
  preparation_tips: z.array(z.string().min(1).max(200)).min(2).max(6),
})

export type FocusAgenda = z.infer<typeof FocusAgendaSchema>
export type AgendaTopic = z.infer<typeof AgendaTopicSchema>
export type AgendaQuestion = z.infer<typeof AgendaQuestionSchema>
export type PreviousActionItem = z.infer<typeof PreviousActionItemSchema>

/**
 * Input data gathered for focus planner context
 */
export interface FocusPlannerInput {
  focus: {
    id: string
    scheduled_at: string
    duration_minutes: number
  }
  goal: {
    id: string
    title: string
    description: string | null
    category: string | null
    success_definition: string | null
    duration_days: number
    created_at: string
  }
  milestones: Array<{
    id: string
    title: string
    description: string | null
    status: string
    target_date: string | null
  }>
  previousFocusSummaries: Array<{
    id: string
    summary: string
    key_decisions: unknown[]
    mentee_action_items: unknown[]
    mentor_action_items: unknown[]
    generated_at: string
  }>
  outstandingActionItems: Array<{
    id: string
    title: string
    description: string | null
    status: string
    due_date: string | null
    assignee_role: 'mentor' | 'mentee'
  }>
  recentCheckIns: Array<{
    id: string
    mood_rating: number
    progress_notes: string | null
    blockers: string | null
    wins: string | null
    week_start: string
  }>
  lastFocusDate: string | null
  menteeDisplayName: string
  mentorDisplayName: string
}

/**
 * System prompt for focus planner - optimized for quality agendas
 */
const systemPrompt = `You are an expert mentoring session planner specializing in creating focused, actionable meeting agendas.
Your role is to help mentors and mentees have productive focus sessions by generating well-structured agendas.

Guidelines for creating effective agendas:
1. TOPICS should be prioritized based on urgency and impact on goal progress
2. HIGH priority topics should address blockers, overdue milestones, or critical decisions
3. MEDIUM priority topics cover regular progress discussions and skill development
4. LOW priority topics are nice-to-have discussions if time permits
5. Estimate time realistically - leave buffer for discussion
6. QUESTIONS should help mentees get specific, actionable guidance
7. PREPARATION TIPS should be concrete actions the mentee can take before the session
8. If there are outstanding action items, they should be reviewed early in the session
9. Consider the mentee's recent mood and blockers when planning the session tone
10. Aim for 3-4 main topics that fit within the session duration`

/**
 * User prompt template for generating focus agenda
 */
const userPromptTemplate = `Generate a focus session agenda based on the following context:

**SESSION INFO:**
- Duration: {duration_minutes} minutes
- Scheduled: {scheduled_at}
- Days since last focus: {days_since_last_focus}

**GOAL CONTEXT:**
- Goal: {goal_title}
- Description: {goal_description}
- Category: {goal_category}
- Success Definition: {success_definition}
- Goal Duration: {goal_duration_days} days
- Goal Created: {goal_created_at}

**MILESTONES ({milestone_count} total):**
{milestones_text}

**PREVIOUS FOCUS SUMMARIES ({summary_count} sessions):**
{previous_summaries_text}

**OUTSTANDING ACTION ITEMS ({action_item_count} items):**
{action_items_text}

**RECENT CHECK-INS:**
{check_ins_text}

**PARTICIPANTS:**
- Mentee: {mentee_name}
- Mentor: {mentor_name}

Generate a focused agenda with:
1. 3-5 discussion TOPICS (prioritized by importance)
2. 4-6 QUESTIONS the mentee should consider asking
3. Review notes for any outstanding action items
4. 3-5 PREPARATION TIPS for the mentee

Return ONLY valid JSON with this exact structure:
{{
  "topics": [
    {{
      "title": "Topic title",
      "description": "What to discuss and expected outcomes",
      "priority": "high|medium|low",
      "estimated_minutes": 15
    }}
  ],
  "questions": [
    {{
      "question": "Specific question to ask mentor",
      "context": "Why this question is relevant now"
    }}
  ],
  "previous_action_items": [
    {{
      "title": "Action item title",
      "status": "pending|in_progress|completed",
      "notes": "What to discuss about this item"
    }}
  ],
  "preparation_tips": [
    "Specific preparation action"
  ]
}}

IMPORTANT: 
- Total estimated_minutes for all topics should not exceed {duration_minutes} minutes
- Topics should be actionable and outcome-focused
- Questions should be specific, not generic
- Preparation tips should be things the mentee can do before the session`

/**
 * Gather all context needed for focus agenda generation
 */
export async function gatherFocusContext(focusId: string): Promise<FocusPlannerInput> {
  const supabase = createServiceClient()

  // Fetch focus with collaboration and goal details
  const { data: focus, error: focusError } = await supabase
    .from('focuses')
    .select(`
      id,
      scheduled_at,
      duration_minutes,
      collaboration:collaborations!focuses_collaboration_id_fkey(
        id,
        mentor_profile_id,
        mentee_profile_id,
        goal:goals!collaborations_goal_id_fkey(
          id,
          title,
          description,
          category,
          success_definition,
          duration_days,
          created_at
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

  const collaboration = focus.collaboration as {
    id: string
    mentor_profile_id: string
    mentee_profile_id: string
    goal: {
      id: string
      title: string
      description: string | null
      category: string | null
      success_definition: string | null
      duration_days: number
      created_at: string
    }
    mentor_profile: { id: string; display_name: string }
    mentee_profile: { id: string; display_name: string }
  }

  if (!collaboration?.goal) {
    throw new Error('Collaboration or goal not found')
  }

  // Fetch milestones for the goal
  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('id, title, description, status, target_date')
    .eq('goal_id', collaboration.goal.id)
    .order('target_date', { ascending: true })

  // Fetch previous focus summaries (last 3)
  const { data: previousFocuses } = await supabase
    .from('focuses')
    .select(`
      id,
      scheduled_at,
      summary:focus_summaries!focus_summaries_focus_id_fkey(
        id,
        summary,
        key_decisions,
        mentee_action_items,
        mentor_action_items,
        generated_at
      )
    `)
    .eq('collaboration_id', collaboration.id)
    .eq('status', 'completed')
    .neq('id', focusId)
    .order('scheduled_at', { ascending: false })
    .limit(3)

  // Extract summaries from previous focuses
  const previousFocusSummaries = (previousFocuses || [])
    .map((f) => {
      const summary = Array.isArray(f.summary) ? f.summary[0] : f.summary
      return summary
    })
    .filter(Boolean) as FocusPlannerInput['previousFocusSummaries']

  // Fetch outstanding action items
  const { data: actionItems } = await supabase
    .from('action_items')
    .select('id, title, description, status, due_date, assignee_profile_id')
    .eq('collaboration_id', collaboration.id)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true })

  const outstandingActionItems = (actionItems || []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    due_date: item.due_date,
    assignee_role: item.assignee_profile_id === collaboration.mentee_profile_id
      ? 'mentee' as const
      : 'mentor' as const,
  }))

  // Fetch recent check-ins (last 4 weeks)
  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('id, mood_rating, progress_notes, blockers, wins, week_start')
    .eq('collaboration_id', collaboration.id)
    .order('week_start', { ascending: false })
    .limit(4)

  // Get last focus date
  const { data: lastFocus } = await supabase
    .from('focuses')
    .select('scheduled_at')
    .eq('collaboration_id', collaboration.id)
    .eq('status', 'completed')
    .neq('id', focusId)
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .single()

  return {
    focus: {
      id: focus.id,
      scheduled_at: focus.scheduled_at,
      duration_minutes: focus.duration_minutes,
    },
    goal: collaboration.goal,
    milestones: milestones || [],
    previousFocusSummaries,
    outstandingActionItems,
    recentCheckIns: checkIns || [],
    lastFocusDate: lastFocus?.scheduled_at || null,
    menteeDisplayName: collaboration.mentee_profile.display_name,
    mentorDisplayName: collaboration.mentor_profile.display_name,
  }
}

/**
 * Format context data for the prompt
 */
function formatContextForPrompt(input: FocusPlannerInput): Record<string, string | number> {
  // Calculate days since last focus
  const daysSinceLastFocus = input.lastFocusDate
    ? Math.floor(
        (new Date(input.focus.scheduled_at).getTime() - new Date(input.lastFocusDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : -1

  // Format milestones
  const milestonesText = input.milestones.length > 0
    ? input.milestones
        .map((m) => {
          const statusEmoji = m.status === 'completed' ? '✅' : m.status === 'in_progress' ? '🔄' : '⏳'
          return `- ${statusEmoji} ${m.title} (${m.status}${m.target_date ? `, due: ${m.target_date}` : ''})`
        })
        .join('\n')
    : 'No milestones defined yet'

  // Format previous summaries
  const previousSummariesText = input.previousFocusSummaries.length > 0
    ? input.previousFocusSummaries
        .map((s, i) => `Session ${i + 1}: ${s.summary.substring(0, 300)}...`)
        .join('\n\n')
    : 'No previous focus summaries available'

  // Format action items
  const actionItemsText = input.outstandingActionItems.length > 0
    ? input.outstandingActionItems
        .map((item) => {
          const overdue = item.due_date && new Date(item.due_date) < new Date() ? ' (OVERDUE)' : ''
          return `- [${item.assignee_role.toUpperCase()}] ${item.title} (${item.status})${overdue}`
        })
        .join('\n')
    : 'No outstanding action items'

  // Format check-ins
  const checkInsText = input.recentCheckIns.length > 0
    ? input.recentCheckIns
        .map((c) => {
          const moodEmojis = ['😢', '😕', '😐', '🙂', '😊']
          const moodEmoji = moodEmojis[c.mood_rating - 1] || '😐'
          return `Week of ${c.week_start}: ${moodEmoji} Mood ${c.mood_rating}/5${c.blockers ? ` | Blockers: ${c.blockers}` : ''}${c.wins ? ` | Wins: ${c.wins}` : ''}`
        })
        .join('\n')
    : 'No recent check-ins'

  return {
    duration_minutes: input.focus.duration_minutes,
    scheduled_at: new Date(input.focus.scheduled_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    days_since_last_focus: daysSinceLastFocus >= 0 ? String(daysSinceLastFocus) : 'First session',
    goal_title: input.goal.title,
    goal_description: input.goal.description || 'No description provided',
    goal_category: input.goal.category || 'General',
    success_definition: input.goal.success_definition || 'Not yet defined',
    goal_duration_days: input.goal.duration_days,
    goal_created_at: new Date(input.goal.created_at).toLocaleDateString(),
    milestone_count: input.milestones.length,
    milestones_text: milestonesText,
    summary_count: input.previousFocusSummaries.length,
    previous_summaries_text: previousSummariesText,
    action_item_count: input.outstandingActionItems.length,
    action_items_text: actionItemsText,
    check_ins_text: checkInsText,
    mentee_name: input.menteeDisplayName,
    mentor_name: input.mentorDisplayName,
  }
}

/**
 * Generate focus agenda using AI
 * 
 * @param focusId - The ID of the focus to generate an agenda for
 * @returns Promise resolving to the generated agenda
 * @throws Error if AI processing fails or returns invalid data
 * 
 * @example
 * ```typescript
 * const agenda = await generateFocusAgenda('focus-uuid')
 * console.log(agenda.topics) // Discussion topics
 * console.log(agenda.questions) // Suggested questions
 * ```
 */
export async function generateFocusAgenda(focusId: string): Promise<FocusAgenda> {
  const openAIApiKey = process.env.OPENAI_API_KEY
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  // Gather context
  const context = await gatherFocusContext(focusId)
  const formattedContext = formatContextForPrompt(context)

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
    openAIApiKey,
    timeout: 45000, // 45 second timeout for complex context
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', userPromptTemplate],
  ])

  const parser = new JsonOutputParser<FocusAgenda>()
  const chain = prompt.pipe(model).pipe(parser)

  try {
    const result = await chain.invoke(formattedContext)

    // Ensure result is an object, not a string
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result

    // Validate the result against the schema
    const validated = FocusAgendaSchema.parse(parsedResult)

    // Add any outstanding action items that weren't included
    const existingItemTitles = new Set(validated.previous_action_items.map((i) => i.title.toLowerCase()))
    for (const item of context.outstandingActionItems) {
      if (!existingItemTitles.has(item.title.toLowerCase())) {
        validated.previous_action_items.push({
          title: item.title,
          status: item.status,
          notes: item.due_date && new Date(item.due_date) < new Date()
            ? 'Overdue - discuss blockers'
            : 'Review progress',
        })
      }
    }

    // Validate total time doesn't exceed session duration (with 10% buffer)
    const totalMinutes = validated.topics.reduce((sum, t) => sum + t.estimated_minutes, 0)
    const maxMinutes = context.focus.duration_minutes * 1.1
    if (totalMinutes > maxMinutes) {
      console.warn(
        `Warning: Agenda total time (${totalMinutes}min) exceeds session duration (${context.focus.duration_minutes}min)`
      )
      // Adjust times proportionally
      const scaleFactor = context.focus.duration_minutes / totalMinutes
      validated.topics = validated.topics.map((t) => ({
        ...t,
        estimated_minutes: Math.max(5, Math.round(t.estimated_minutes * scaleFactor)),
      }))
    }

    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Focus Planner validation error:', error.errors)
      throw new Error(`Invalid agenda data: ${error.errors.map((e) => e.message).join(', ')}`)
    }

    if (
      error instanceof SyntaxError ||
      (error instanceof Error && (error.message.includes('JSON') || error.message.includes('parse')))
    ) {
      console.error('JSON parsing error in Focus Planner:', error)
      throw new Error('Failed to parse agenda JSON. The AI response was invalid. Please try again.')
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('Agenda generation timed out. Please try again.')
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

    console.error('Error generating focus agenda:', error)
    throw new Error(`Failed to generate focus agenda: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Save generated agenda to database
 */
export async function saveFocusAgenda(focusId: string, agenda: FocusAgenda): Promise<string> {
  const supabase = createServiceClient()

  // Check if agenda already exists
  const { data: existing } = await supabase
    .from('focus_agendas')
    .select('id')
    .eq('focus_id', focusId)
    .single()

  if (existing) {
    // Update existing agenda
    const { error } = await supabase
      .from('focus_agendas')
      .update({
        topics: agenda.topics,
        questions: agenda.questions,
        previous_action_items: agenda.previous_action_items,
        preparation_tips: agenda.preparation_tips,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('focus_id', focusId)

    if (error) {
      throw new Error(`Failed to update agenda: ${error.message}`)
    }

    return existing.id
  } else {
    // Insert new agenda
    const { data, error } = await supabase
      .from('focus_agendas')
      .insert({
        focus_id: focusId,
        topics: agenda.topics,
        questions: agenda.questions,
        previous_action_items: agenda.previous_action_items,
        preparation_tips: agenda.preparation_tips,
        generated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to save agenda: ${error.message}`)
    }

    return data.id
  }
}

/**
 * Generate and save focus agenda in one operation
 */
export async function generateAndSaveFocusAgenda(focusId: string): Promise<{
  agendaId: string
  agenda: FocusAgenda
}> {
  const agenda = await generateFocusAgenda(focusId)
  const agendaId = await saveFocusAgenda(focusId, agenda)
  return { agendaId, agenda }
}

/**
 * Check if a focus needs agenda generation (scheduled within 24-48 hours)
 */
export function shouldAutoGenerateAgenda(scheduledAt: string | Date): boolean {
  const now = new Date()
  const focusDate = new Date(scheduledAt)
  const hoursUntilFocus = (focusDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  // Generate agenda if focus is 24-48 hours away
  return hoursUntilFocus > 0 && hoursUntilFocus <= 48
}

/**
 * Auto-generate agendas for focuses scheduled in the next 24-48 hours
 * This function is designed to be called by a cron job
 * 
 * @returns Array of focus IDs that had agendas generated
 */
export async function autoGeneratePendingAgendas(): Promise<string[]> {
  const supabase = createServiceClient()

  // Find focuses scheduled in the next 48 hours without agendas
  const now = new Date()
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const { data: pendingFocuses, error } = await supabase
    .from('focuses')
    .select(`
      id,
      scheduled_at,
      agenda:focus_agendas!focus_agendas_focus_id_fkey(id)
    `)
    .eq('status', 'scheduled')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', in48Hours.toISOString())

  if (error) {
    console.error('Error fetching pending focuses:', error)
    throw new Error(`Failed to fetch pending focuses: ${error.message}`)
  }

  const generatedFocusIds: string[] = []

  for (const focus of pendingFocuses || []) {
    // Skip if agenda already exists
    const hasAgenda = Array.isArray(focus.agenda) ? focus.agenda.length > 0 : !!focus.agenda
    if (hasAgenda) {
      continue
    }

    try {
      await generateAndSaveFocusAgenda(focus.id)
      generatedFocusIds.push(focus.id)
      console.log(`Generated agenda for focus ${focus.id}`)
    } catch (err) {
      console.error(`Failed to generate agenda for focus ${focus.id}:`, err)
      // Continue with other focuses
    }
  }

  return generatedFocusIds
}
