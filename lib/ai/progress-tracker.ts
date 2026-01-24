import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Schema for risk areas identified in progress analysis
 */
const RiskAreaSchema = z.object({
  area: z.string().min(1).max(200),
  severity: z.enum(['high', 'medium', 'low']),
  description: z.string().min(1).max(500),
  suggested_action: z.string().min(1).max(300),
})

/**
 * Schema for recommendations
 */
const RecommendationSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  priority: z.enum(['high', 'medium', 'low']),
  category: z.enum(['milestone', 'focus', 'action_item', 'communication', 'general']),
})

/**
 * Schema for the complete progress analysis
 */
export const ProgressAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  trend: z.enum(['improving', 'stable', 'declining']),
  analysis: z.string().min(50).max(2000),
  risk_areas: z.array(RiskAreaSchema).max(5),
  recommendations: z.array(RecommendationSchema).min(1).max(5),
  predicted_completion_date: z.string().nullable(),
})

export type ProgressAnalysis = z.infer<typeof ProgressAnalysisSchema>
export type RiskArea = z.infer<typeof RiskAreaSchema>
export type Recommendation = z.infer<typeof RecommendationSchema>

/**
 * Input data gathered for progress analysis context
 */
export interface ProgressTrackerInput {
  collaboration: {
    id: string
    status: string
    started_at: string | null
    created_at: string
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
  focuses: Array<{
    id: string
    scheduled_at: string
    status: string
    completed_at: string | null
  }>
  actionItems: Array<{
    id: string
    title: string
    status: string
    due_date: string | null
    completed_at: string | null
    assignee_role: 'mentor' | 'mentee'
  }>
  checkIns: Array<{
    id: string
    mood_rating: number
    progress_notes: string | null
    blockers: string | null
    wins: string | null
    week_start: string
  }>
  previousScores: Array<{
    id: string
    score: number
    trend: string
    generated_at: string
  }>
  menteeDisplayName: string
  mentorDisplayName: string
}

/**
 * System prompt for progress tracker - optimized for accurate analysis
 */
const systemPrompt = `You are an expert progress analyst for a mentoring platform. Your role is to analyze collaboration progress and provide actionable insights.

You evaluate collaborations based on:
1. MILESTONE COMPLETION - What percentage of milestones are complete or in progress vs. pending/overdue?
2. FOCUS ATTENDANCE - Are scheduled focuses being completed? Any no-shows or cancellations?
3. ACTION ITEM COMPLETION - What percentage of action items are completed on time?
4. CHECK-IN DATA - What is the mentee's mood trend? Are they reporting blockers consistently?
5. ENGAGEMENT PATTERNS - How frequent are interactions? Are focuses being scheduled regularly?

Scoring Guidelines:
- 90-100: Excellent progress, ahead of schedule, high engagement
- 75-89: Good progress, on track, regular engagement
- 60-74: Moderate progress, some delays or gaps, needs attention
- 40-59: Below expected progress, significant concerns, intervention needed
- 0-39: Critical concerns, major blockers, at risk of failure

Trend Analysis:
- IMPROVING: Recent metrics show upward trajectory (more completions, better mood, fewer blockers)
- STABLE: Metrics are consistent with previous analysis periods
- DECLINING: Recent metrics show downward trajectory (missed milestones, lower mood, more blockers)

Predicted Completion Date:
- Calculate based on current velocity and remaining milestones
- Return null if insufficient data to predict
- Format as YYYY-MM-DD

Be specific and actionable in your analysis. Avoid generic statements.`

/**
 * User prompt template for progress analysis
 */
const userPromptTemplate = `Analyze the following collaboration progress and generate a comprehensive assessment:

**COLLABORATION INFO:**
- Status: {collaboration_status}
- Started: {collaboration_started_at}
- Duration So Far: {days_elapsed} days

**GOAL CONTEXT:**
- Goal: {goal_title}
- Description: {goal_description}
- Category: {goal_category}
- Success Definition: {success_definition}
- Planned Duration: {goal_duration_days} days
- Goal Created: {goal_created_at}
- Days Remaining (based on planned duration): {days_remaining} days

**MILESTONE STATUS ({milestone_count} total):**
{milestones_text}

**FOCUS SESSION HISTORY ({focus_count} sessions):**
- Completed: {completed_focuses}
- Scheduled (upcoming): {scheduled_focuses}
- Cancelled/No-show: {cancelled_focuses}
- Focus Attendance Rate: {focus_attendance_rate}%
{focuses_text}

**ACTION ITEMS ({action_item_count} total):**
- Completed: {completed_action_items}
- In Progress: {in_progress_action_items}
- Pending: {pending_action_items}
- Overdue: {overdue_action_items}
- Completion Rate: {action_item_completion_rate}%
{action_items_text}

**RECENT CHECK-INS ({check_in_count} check-ins):**
- Average Mood Rating: {average_mood}/5
{check_ins_text}

**PREVIOUS PROGRESS SCORES ({previous_score_count} analyses):**
{previous_scores_text}

**PARTICIPANTS:**
- Mentee: {mentee_name}
- Mentor: {mentor_name}

Generate a comprehensive progress analysis with:
1. Overall SCORE (0-100) based on all metrics
2. TREND (improving/stable/declining) compared to previous analyses
3. Detailed ANALYSIS text (200-500 words)
4. Up to 5 RISK AREAS that need attention
5. 2-5 actionable RECOMMENDATIONS
6. PREDICTED COMPLETION DATE (or null if insufficient data)

Return ONLY valid JSON with this exact structure:
{{
  "score": 75,
  "trend": "improving",
  "analysis": "Detailed analysis text...",
  "risk_areas": [
    {{
      "area": "Milestone delays",
      "severity": "high|medium|low",
      "description": "Description of the risk",
      "suggested_action": "What to do about it"
    }}
  ],
  "recommendations": [
    {{
      "title": "Recommendation title",
      "description": "Detailed recommendation",
      "priority": "high|medium|low",
      "category": "milestone|focus|action_item|communication|general"
    }}
  ],
  "predicted_completion_date": "2026-02-15" or null
}}

IMPORTANT:
- Be specific to this collaboration's data, not generic
- Score should reflect the actual metrics provided
- Consider velocity trends when predicting completion
- Risk areas should be actionable
- Recommendations should be practical and specific`

/**
 * Gather all context needed for progress analysis
 */
export async function gatherProgressContext(collaborationId: string): Promise<ProgressTrackerInput> {
  const supabase = createServiceClient()

  // Fetch collaboration with goal details
  const { data: collaboration, error: collabError } = await supabase
    .from('collaborations')
    .select(`
      id,
      status,
      started_at,
      created_at,
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
    `)
    .eq('id', collaborationId)
    .single()

  if (collabError || !collaboration) {
    throw new Error(`Collaboration not found: ${collabError?.message || 'Unknown error'}`)
  }

  const goal = (Array.isArray(collaboration.goal) ? collaboration.goal[0] : collaboration.goal) as {
    id: string
    title: string
    description: string | null
    category: string | null
    success_definition: string | null
    duration_days: number
    created_at: string
  } | null

  const mentorProfile = (Array.isArray(collaboration.mentor_profile) ? collaboration.mentor_profile[0] : collaboration.mentor_profile) as { id: string; display_name: string } | null
  const menteeProfile = (Array.isArray(collaboration.mentee_profile) ? collaboration.mentee_profile[0] : collaboration.mentee_profile) as { id: string; display_name: string } | null

  if (!goal) {
    throw new Error('Goal not found for collaboration')
  }

  if (!mentorProfile || !menteeProfile) {
    throw new Error('Profile information missing for collaboration')
  }

  // Fetch milestones for the goal
  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('id, title, description, status, target_date')
    .eq('goal_id', goal.id)
    .order('target_date', { ascending: true })

  // Fetch focuses for the collaboration
  const { data: focuses } = await supabase
    .from('focuses')
    .select('id, scheduled_at, status, completed_at')
    .eq('collaboration_id', collaborationId)
    .order('scheduled_at', { ascending: false })

  // Fetch action items for the collaboration
  const { data: actionItemsRaw } = await supabase
    .from('action_items')
    .select('id, title, status, due_date, completed_at, assignee_profile_id')
    .eq('collaboration_id', collaborationId)
    .order('due_date', { ascending: true })

  const actionItems = (actionItemsRaw || []).map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    due_date: item.due_date,
    completed_at: item.completed_at,
    assignee_role: item.assignee_profile_id === menteeProfile.id
      ? 'mentee' as const
      : 'mentor' as const,
  }))

  // Fetch check-ins for the collaboration
  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('id, mood_rating, progress_notes, blockers, wins, week_start')
    .eq('collaboration_id', collaborationId)
    .order('week_start', { ascending: false })
    .limit(8)

  // Fetch previous progress scores (last 5)
  const { data: previousScores } = await supabase
    .from('progress_scores')
    .select('id, score, trend, generated_at')
    .eq('collaboration_id', collaborationId)
    .order('generated_at', { ascending: false })
    .limit(5)

  return {
    collaboration: {
      id: collaboration.id,
      status: collaboration.status,
      started_at: collaboration.started_at,
      created_at: collaboration.created_at,
    },
    goal,
    milestones: milestones || [],
    focuses: focuses || [],
    actionItems,
    checkIns: checkIns || [],
    previousScores: previousScores || [],
    menteeDisplayName: menteeProfile.display_name,
    mentorDisplayName: mentorProfile.display_name,
  }
}

/**
 * Format context data for the prompt
 */
function formatContextForPrompt(input: ProgressTrackerInput): Record<string, string | number> {
  const now = new Date()
  const startDate = input.collaboration.started_at
    ? new Date(input.collaboration.started_at)
    : new Date(input.collaboration.created_at)
  
  const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, input.goal.duration_days - daysElapsed)

  // Calculate milestone stats
  const completedMilestones = input.milestones.filter((m) => m.status === 'completed').length
  const inProgressMilestones = input.milestones.filter((m) => m.status === 'in_progress').length
  const pendingMilestones = input.milestones.filter((m) => m.status === 'pending').length
  const overdueMilestones = input.milestones.filter((m) => {
    return m.status !== 'completed' && m.target_date && new Date(m.target_date) < now
  }).length

  // Calculate focus stats
  const completedFocuses = input.focuses.filter((f) => f.status === 'completed').length
  const scheduledFocuses = input.focuses.filter((f) => f.status === 'scheduled').length
  const cancelledFocuses = input.focuses.filter((f) => 
    f.status === 'cancelled' || f.status === 'no_show'
  ).length
  const totalPastFocuses = completedFocuses + cancelledFocuses
  const focusAttendanceRate = totalPastFocuses > 0
    ? Math.round((completedFocuses / totalPastFocuses) * 100)
    : 100

  // Calculate action item stats
  const completedActionItems = input.actionItems.filter((a) => a.status === 'completed').length
  const inProgressActionItems = input.actionItems.filter((a) => a.status === 'in_progress').length
  const pendingActionItems = input.actionItems.filter((a) => a.status === 'pending').length
  const overdueActionItems = input.actionItems.filter((a) => {
    return a.status !== 'completed' && a.due_date && new Date(a.due_date) < now
  }).length
  const totalActionItems = input.actionItems.length
  const actionItemCompletionRate = totalActionItems > 0
    ? Math.round((completedActionItems / totalActionItems) * 100)
    : 100

  // Calculate average mood
  const averageMood = input.checkIns.length > 0
    ? (input.checkIns.reduce((sum, c) => sum + c.mood_rating, 0) / input.checkIns.length).toFixed(1)
    : 'N/A'

  // Format milestones text
  const milestonesText = input.milestones.length > 0
    ? input.milestones
        .map((m) => {
          const statusEmoji = m.status === 'completed' ? '✅' : m.status === 'in_progress' ? '🔄' : '⏳'
          const overdue = m.status !== 'completed' && m.target_date && new Date(m.target_date) < now
            ? ' (OVERDUE)'
            : ''
          return `- ${statusEmoji} ${m.title} [${m.status}]${m.target_date ? ` due: ${m.target_date}` : ''}${overdue}`
        })
        .join('\n')
    : 'No milestones defined'

  // Format focuses text
  const focusesText = input.focuses.slice(0, 5).length > 0
    ? input.focuses
        .slice(0, 5)
        .map((f) => `- ${f.scheduled_at.split('T')[0]} [${f.status}]`)
        .join('\n')
    : 'No focus sessions recorded'

  // Format action items text
  const actionItemsText = input.actionItems.slice(0, 10).length > 0
    ? input.actionItems
        .slice(0, 10)
        .map((a) => {
          const overdue = a.status !== 'completed' && a.due_date && new Date(a.due_date) < now
            ? ' (OVERDUE)'
            : ''
          return `- [${a.assignee_role.toUpperCase()}] ${a.title} [${a.status}]${overdue}`
        })
        .join('\n')
    : 'No action items recorded'

  // Format check-ins text
  const checkInsText = input.checkIns.length > 0
    ? input.checkIns
        .slice(0, 4)
        .map((c) => {
          const moodEmojis = ['😢', '😕', '😐', '🙂', '😊']
          const moodEmoji = moodEmojis[c.mood_rating - 1] || '😐'
          let text = `- Week of ${c.week_start}: ${moodEmoji} Mood ${c.mood_rating}/5`
          if (c.blockers) text += ` | Blockers: ${c.blockers.substring(0, 100)}`
          if (c.wins) text += ` | Wins: ${c.wins.substring(0, 100)}`
          return text
        })
        .join('\n')
    : 'No check-ins recorded'

  // Format previous scores text
  const previousScoresText = input.previousScores.length > 0
    ? input.previousScores
        .map((s) => `- ${s.generated_at.split('T')[0]}: Score ${s.score}/100 (${s.trend})`)
        .join('\n')
    : 'No previous progress analyses'

  return {
    collaboration_status: input.collaboration.status,
    collaboration_started_at: startDate.toLocaleDateString(),
    days_elapsed: daysElapsed,
    goal_title: input.goal.title,
    goal_description: input.goal.description || 'No description provided',
    goal_category: input.goal.category || 'General',
    success_definition: input.goal.success_definition || 'Not defined',
    goal_duration_days: input.goal.duration_days,
    goal_created_at: new Date(input.goal.created_at).toLocaleDateString(),
    days_remaining: daysRemaining,
    milestone_count: input.milestones.length,
    completed_milestones: completedMilestones,
    in_progress_milestones: inProgressMilestones,
    pending_milestones: pendingMilestones,
    overdue_milestones: overdueMilestones,
    milestones_text: milestonesText,
    focus_count: input.focuses.length,
    completed_focuses: completedFocuses,
    scheduled_focuses: scheduledFocuses,
    cancelled_focuses: cancelledFocuses,
    focus_attendance_rate: focusAttendanceRate,
    focuses_text: focusesText,
    action_item_count: totalActionItems,
    completed_action_items: completedActionItems,
    in_progress_action_items: inProgressActionItems,
    pending_action_items: pendingActionItems,
    overdue_action_items: overdueActionItems,
    action_item_completion_rate: actionItemCompletionRate,
    action_items_text: actionItemsText,
    check_in_count: input.checkIns.length,
    average_mood: averageMood,
    check_ins_text: checkInsText,
    previous_score_count: input.previousScores.length,
    previous_scores_text: previousScoresText,
    mentee_name: input.menteeDisplayName,
    mentor_name: input.mentorDisplayName,
  }
}

/**
 * Generate progress analysis using AI
 * 
 * @param collaborationId - The ID of the collaboration to analyze
 * @returns Promise resolving to the progress analysis
 * @throws Error if AI processing fails or returns invalid data
 * 
 * @example
 * ```typescript
 * const analysis = await generateProgressAnalysis('collab-uuid')
 * console.log(analysis.score) // 0-100
 * console.log(analysis.trend) // 'improving' | 'stable' | 'declining'
 * console.log(analysis.risk_areas) // Array of identified risks
 * ```
 */
export async function generateProgressAnalysis(collaborationId: string): Promise<ProgressAnalysis> {
  const openAIApiKey = process.env.OPENAI_API_KEY
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  // Gather context
  const context = await gatherProgressContext(collaborationId)
  const formattedContext = formatContextForPrompt(context)

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.5, // Lower temperature for more consistent scoring
    openAIApiKey,
    timeout: 60000, // 60 second timeout for complex analysis
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', userPromptTemplate],
  ])

  const parser = new JsonOutputParser<ProgressAnalysis>()
  const chain = prompt.pipe(model).pipe(parser)

  try {
    const result = await chain.invoke(formattedContext)

    // Ensure result is an object, not a string
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result

    // Validate the result against the schema
    const validated = ProgressAnalysisSchema.parse(parsedResult)

    // Validate predicted_completion_date format if present
    if (validated.predicted_completion_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(validated.predicted_completion_date)) {
        // Try to parse and reformat
        const parsed = new Date(validated.predicted_completion_date)
        if (!isNaN(parsed.getTime())) {
          validated.predicted_completion_date = parsed.toISOString().split('T')[0]
        } else {
          validated.predicted_completion_date = null
        }
      }
    }

    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Progress Tracker validation error:', error.errors)
      throw new Error(`Invalid progress analysis: ${error.errors.map((e) => e.message).join(', ')}`)
    }

    if (
      error instanceof SyntaxError ||
      (error instanceof Error && (error.message.includes('JSON') || error.message.includes('parse')))
    ) {
      console.error('JSON parsing error in Progress Tracker:', error)
      throw new Error('Failed to parse progress analysis JSON. The AI response was invalid. Please try again.')
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('Progress analysis timed out. Please try again.')
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

    console.error('Error generating progress analysis:', error)
    throw new Error(`Failed to generate progress analysis: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Save progress analysis to database
 */
export async function saveProgressAnalysis(
  collaborationId: string,
  analysis: ProgressAnalysis
): Promise<string> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('progress_scores')
    .insert({
      collaboration_id: collaborationId,
      score: analysis.score,
      trend: analysis.trend,
      analysis: analysis.analysis,
      risk_areas: analysis.risk_areas,
      recommendations: analysis.recommendations,
      predicted_completion_date: analysis.predicted_completion_date,
      generated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to save progress analysis: ${error.message}`)
  }

  return data.id
}

/**
 * Generate and save progress analysis in one operation
 */
export async function generateAndSaveProgressAnalysis(collaborationId: string): Promise<{
  analysisId: string
  analysis: ProgressAnalysis
}> {
  const analysis = await generateProgressAnalysis(collaborationId)
  const analysisId = await saveProgressAnalysis(collaborationId, analysis)
  return { analysisId, analysis }
}

/**
 * Get all active collaborations that need weekly progress analysis
 * A collaboration needs analysis if:
 * 1. It is in 'active' status
 * 2. No analysis was done in the last 6 days (weekly cadence)
 */
export async function getCollaborationsNeedingAnalysis(): Promise<string[]> {
  const supabase = createServiceClient()

  // Get all active collaborations
  const { data: activeCollaborations, error: collabError } = await supabase
    .from('collaborations')
    .select('id')
    .eq('status', 'active')

  if (collabError) {
    throw new Error(`Failed to fetch collaborations: ${collabError.message}`)
  }

  if (!activeCollaborations || activeCollaborations.length === 0) {
    return []
  }

  const collaborationIds = activeCollaborations.map((c) => c.id)

  // Get collaborations with recent progress scores (within last 6 days)
  const sixDaysAgo = new Date()
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)

  const { data: recentScores, error: scoresError } = await supabase
    .from('progress_scores')
    .select('collaboration_id')
    .in('collaboration_id', collaborationIds)
    .gte('generated_at', sixDaysAgo.toISOString())

  if (scoresError) {
    throw new Error(`Failed to fetch progress scores: ${scoresError.message}`)
  }

  // Filter out collaborations with recent analyses
  const recentlyAnalyzedIds = new Set((recentScores || []).map((s) => s.collaboration_id))
  const needingAnalysis = collaborationIds.filter((id) => !recentlyAnalyzedIds.has(id))

  return needingAnalysis
}

/**
 * Run weekly progress analysis for all active collaborations
 * This function is designed to be called by a cron job
 * 
 * @returns Array of collaboration IDs that had progress analyzed
 */
export async function runWeeklyProgressAnalysis(): Promise<{
  analyzed: string[]
  failed: Array<{ id: string; error: string }>
}> {
  const collaborationIds = await getCollaborationsNeedingAnalysis()
  
  const analyzed: string[] = []
  const failed: Array<{ id: string; error: string }> = []

  for (const collaborationId of collaborationIds) {
    try {
      await generateAndSaveProgressAnalysis(collaborationId)
      analyzed.push(collaborationId)
      console.log(`Generated progress analysis for collaboration ${collaborationId}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error(`Failed to analyze collaboration ${collaborationId}:`, err)
      failed.push({ id: collaborationId, error: errorMessage })
      // Continue with other collaborations
    }
  }

  return { analyzed, failed }
}
