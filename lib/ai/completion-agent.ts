import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Schema for key achievements/milestones in the final summary
 */
const AchievementSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  impact: z.enum(['high', 'medium', 'low']),
})

/**
 * Schema for skills developed during the mentorship
 */
const SkillDevelopedSchema = z.object({
  skill: z.string().min(1).max(100),
  level: z.enum(['introduced', 'developed', 'mastered']),
  evidence: z.string().min(1).max(300),
})

/**
 * Schema for the complete goal completion summary
 */
export const GoalCompletionSummarySchema = z.object({
  final_summary: z.string().min(100).max(3000),
  key_achievements: z.array(AchievementSchema).min(1).max(10),
  skills_developed: z.array(SkillDevelopedSchema).max(10),
  journey_highlights: z.array(z.string().min(1).max(300)).max(5),
  mentor_contribution: z.string().min(50).max(500),
  next_steps: z.array(z.string().min(1).max(200)).max(5),
  overall_progress_rating: z.number().int().min(1).max(5),
})

/**
 * Schema for LinkedIn post generation
 */
export const LinkedInPostSchema = z.object({
  linkedin_post_text: z.string().min(100).max(3000),
  hashtags: z.array(z.string().min(1).max(50)).max(10),
  emoji_version: z.string().min(100).max(3000),
})

export type GoalCompletionSummary = z.infer<typeof GoalCompletionSummarySchema>
export type LinkedInPost = z.infer<typeof LinkedInPostSchema>
export type Achievement = z.infer<typeof AchievementSchema>
export type SkillDeveloped = z.infer<typeof SkillDevelopedSchema>

/**
 * Input data gathered for completion summary context
 */
export interface CompletionAgentInput {
  goal: {
    id: string
    title: string
    description: string | null
    category: string | null
    success_definition: string | null
    duration_days: number
    created_at: string
  }
  collaboration: {
    id: string
    started_at: string | null
    completed_at: string | null
    created_at: string
  } | null
  milestones: Array<{
    id: string
    title: string
    description: string | null
    status: string
    completed_at: string | null
  }>
  focuses: Array<{
    id: string
    scheduled_at: string
    status: string
    summary: string | null
  }>
  actionItems: Array<{
    id: string
    title: string
    status: string
    completed_at: string | null
  }>
  checkIns: Array<{
    id: string
    mood_rating: number
    progress_notes: string | null
    wins: string | null
    week_start: string
  }>
  menteeDisplayName: string
  mentorDisplayName: string | null
}

/**
 * System prompt for completion summary agent
 */
const summarySystemPrompt = `You are an expert mentor and career coach helping to summarize a completed goal journey.
Your role is to create a comprehensive, celebratory summary that highlights achievements and growth.

Guidelines:
1. Be CELEBRATORY - this is an achievement to be proud of
2. Be SPECIFIC - reference actual milestones, focuses, and accomplishments
3. Be CONSTRUCTIVE - suggest meaningful next steps
4. Be BALANCED - acknowledge both mentee effort and mentor contribution
5. Use the success_definition if provided to evaluate completion
6. Calculate overall_progress_rating based on milestone completion and check-in sentiment

Rating Guidelines:
- 5: Exceeded expectations, exceptional progress, all milestones completed
- 4: Met expectations, strong progress, most milestones completed
- 3: Good progress, on track, majority of milestones completed
- 2: Some progress made, several milestones incomplete
- 1: Limited progress, significant gaps remain`

/**
 * User prompt template for completion summary
 */
const summaryUserPromptTemplate = `Generate a comprehensive completion summary for the following achieved goal:

**GOAL INFORMATION:**
- Title: {goal_title}
- Category: {goal_category}
- Description: {goal_description}
- Success Definition: {success_definition}
- Duration: {duration_days} days (actual: {actual_days} days)
- Created: {goal_created_at}

**COLLABORATION DETAILS:**
- Mentee: {mentee_name}
- Mentor: {mentor_name}
- Started: {collaboration_started_at}
- Completed: {collaboration_completed_at}

**MILESTONES ({milestone_count} total):**
{milestones_text}

**FOCUS SESSIONS ({focus_count} sessions):**
{focuses_text}

**ACTION ITEMS ({action_item_count} total, {completed_items} completed):**
{action_items_text}

**CHECK-IN HISTORY ({check_in_count} check-ins):**
- Average Mood: {average_mood}/5
{check_ins_text}

Generate a comprehensive completion summary with:
1. FINAL_SUMMARY: 2-4 paragraphs celebrating the achievement
2. KEY_ACHIEVEMENTS: List of specific accomplishments with impact
3. SKILLS_DEVELOPED: Skills the mentee developed with evidence
4. JOURNEY_HIGHLIGHTS: Top 3-5 memorable moments or breakthroughs
5. MENTOR_CONTRIBUTION: How the mentor helped achieve this goal
6. NEXT_STEPS: Suggested next steps for continued growth
7. OVERALL_PROGRESS_RATING: 1-5 based on success criteria

Return ONLY valid JSON with this exact structure:
{{
  "final_summary": "Comprehensive summary celebrating the achievement...",
  "key_achievements": [
    {{
      "title": "Achievement title",
      "description": "What was accomplished",
      "impact": "high|medium|low"
    }}
  ],
  "skills_developed": [
    {{
      "skill": "Skill name",
      "level": "introduced|developed|mastered",
      "evidence": "How this was demonstrated"
    }}
  ],
  "journey_highlights": [
    "First highlight or breakthrough moment",
    "Second highlight"
  ],
  "mentor_contribution": "How the mentor supported this journey...",
  "next_steps": [
    "Recommended next step 1",
    "Recommended next step 2"
  ],
  "overall_progress_rating": 4
}}

IMPORTANT:
- Be specific to this goal's actual data
- Highlight concrete accomplishments from milestones and focuses
- Make the mentee feel proud of their achievement
- Provide actionable next steps for continued growth`

/**
 * System prompt for LinkedIn post generation
 */
const linkedInSystemPrompt = `You are an expert LinkedIn content creator helping professionals share their achievements.
Your role is to create engaging, professional LinkedIn posts that celebrate goal completion.

Guidelines:
1. Be AUTHENTIC - genuine, not boastful
2. Be GRATEFUL - acknowledge help received
3. Be VALUABLE - include lessons learned others can benefit from
4. Use professional but warm tone
5. Include relevant hashtags (career, skills, industry-specific)
6. Keep under LinkedIn's character limits
7. Create two versions: one clean, one with strategic emojis`

/**
 * User prompt template for LinkedIn post
 */
const linkedInUserPromptTemplate = `Generate a LinkedIn achievement post for the following completed goal:

**GOAL:**
- Title: {goal_title}
- Category: {goal_category}
- Description: {goal_description}

**JOURNEY:**
- Duration: {duration_text}
- Mentee: {mentee_name}
- Mentor: {mentor_name}
- Key achievements: {achievements_text}
- Skills developed: {skills_text}

**MENTEE'S REFLECTION (if provided):**
{mentee_reflection}

Generate a LinkedIn achievement post with:
1. LINKEDIN_POST_TEXT: Professional, engaging post (without emojis)
2. HASHTAGS: 5-8 relevant hashtags
3. EMOJI_VERSION: Same post but with strategic emojis for engagement

The post should:
- Start with an attention-grabbing opening
- Share the goal and journey briefly
- Thank the mentor by name
- Share 1-2 key learnings
- End with a call to action or reflection question

Return ONLY valid JSON with this exact structure:
{{
  "linkedin_post_text": "Professional post text without emojis...",
  "hashtags": ["#CareerGrowth", "#Mentorship", "#Achievement"],
  "emoji_version": "🎉 Same post with strategic emojis..."
}}

IMPORTANT:
- Keep it authentic and professional
- Don't oversell or sound arrogant
- Focus on growth and gratitude
- Make it shareable and engaging`

/**
 * Gather all context needed for completion summary
 */
export async function gatherCompletionContext(goalId: string): Promise<CompletionAgentInput> {
  const supabase = createServiceClient()

  // Fetch goal with details
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select(`
      id,
      title,
      description,
      category,
      success_definition,
      duration_days,
      created_at,
      profile:profiles!goals_profile_id_fkey(
        id,
        display_name
      )
    `)
    .eq('id', goalId)
    .single()

  if (goalError || !goal) {
    throw new Error(`Goal not found: ${goalError?.message || 'Unknown error'}`)
  }

  const menteeProfile = goal.profile as { id: string; display_name: string }

  // Fetch collaboration (if exists)
  const { data: collaboration } = await supabase
    .from('collaborations')
    .select(`
      id,
      started_at,
      completed_at,
      created_at,
      mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
        id,
        display_name
      )
    `)
    .eq('goal_id', goalId)
    .in('status', ['active', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const mentorProfile = collaboration?.mentor_profile as { id: string; display_name: string } | null

  // Fetch milestones
  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('id, title, description, status, completed_at')
    .eq('goal_id', goalId)
    .order('target_date', { ascending: true })

  // Fetch focuses with summaries if collaboration exists
  let focuses: CompletionAgentInput['focuses'] = []
  if (collaboration) {
    const { data: focusData } = await supabase
      .from('focuses')
      .select(`
        id,
        scheduled_at,
        status,
        focus_summaries!focus_summaries_focus_id_fkey(summary)
      `)
      .eq('collaboration_id', collaboration.id)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false })
      .limit(10)

    focuses = (focusData || []).map((f) => ({
      id: f.id,
      scheduled_at: f.scheduled_at,
      status: f.status,
      summary: (f.focus_summaries as { summary: string } | null)?.summary || null,
    }))
  }

  // Fetch action items if collaboration exists
  let actionItems: CompletionAgentInput['actionItems'] = []
  if (collaboration) {
    const { data: itemsData } = await supabase
      .from('action_items')
      .select('id, title, status, completed_at')
      .eq('collaboration_id', collaboration.id)
      .order('created_at', { ascending: false })

    actionItems = itemsData || []
  }

  // Fetch check-ins if collaboration exists
  let checkIns: CompletionAgentInput['checkIns'] = []
  if (collaboration) {
    const { data: checkInData } = await supabase
      .from('check_ins')
      .select('id, mood_rating, progress_notes, wins, week_start')
      .eq('collaboration_id', collaboration.id)
      .order('week_start', { ascending: false })
      .limit(10)

    checkIns = checkInData || []
  }

  return {
    goal: {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      category: goal.category,
      success_definition: goal.success_definition,
      duration_days: goal.duration_days,
      created_at: goal.created_at,
    },
    collaboration: collaboration
      ? {
          id: collaboration.id,
          started_at: collaboration.started_at,
          completed_at: collaboration.completed_at,
          created_at: collaboration.created_at,
        }
      : null,
    milestones: milestones || [],
    focuses,
    actionItems,
    checkIns,
    menteeDisplayName: menteeProfile.display_name,
    mentorDisplayName: mentorProfile?.display_name || null,
  }
}

/**
 * Format context data for the summary prompt
 */
function formatSummaryContextForPrompt(
  input: CompletionAgentInput
): Record<string, string | number> {
  const now = new Date()
  const goalCreated = new Date(input.goal.created_at)
  const actualDays = Math.floor(
    (now.getTime() - goalCreated.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Format milestones
  const completedMilestones = input.milestones.filter((m) => m.status === 'completed').length
  const milestonesText =
    input.milestones.length > 0
      ? input.milestones
          .map((m) => {
            const emoji = m.status === 'completed' ? '✅' : '⏳'
            return `- ${emoji} ${m.title} [${m.status}]`
          })
          .join('\n')
      : 'No milestones defined'

  // Format focuses
  const focusesText =
    input.focuses.length > 0
      ? input.focuses
          .slice(0, 5)
          .map((f) => {
            const date = new Date(f.scheduled_at).toLocaleDateString()
            const summaryPreview = f.summary
              ? `: ${f.summary.substring(0, 100)}...`
              : ''
            return `- ${date}${summaryPreview}`
          })
          .join('\n')
      : 'No focus sessions recorded'

  // Format action items
  const completedItems = input.actionItems.filter((a) => a.status === 'completed').length
  const actionItemsText =
    input.actionItems.length > 0
      ? input.actionItems
          .slice(0, 10)
          .map((a) => `- [${a.status === 'completed' ? '✅' : '⏳'}] ${a.title}`)
          .join('\n')
      : 'No action items recorded'

  // Calculate average mood
  const averageMood =
    input.checkIns.length > 0
      ? (
          input.checkIns.reduce((sum, c) => sum + c.mood_rating, 0) /
          input.checkIns.length
        ).toFixed(1)
      : 'N/A'

  // Format check-ins
  const checkInsText =
    input.checkIns.length > 0
      ? input.checkIns
          .slice(0, 5)
          .map((c) => {
            const moodEmojis = ['😢', '😕', '😐', '🙂', '😊']
            const emoji = moodEmojis[c.mood_rating - 1] || '😐'
            let text = `- Week of ${c.week_start}: ${emoji} ${c.mood_rating}/5`
            if (c.wins) text += ` | Win: ${c.wins.substring(0, 80)}...`
            return text
          })
          .join('\n')
      : 'No check-ins recorded'

  return {
    goal_title: input.goal.title,
    goal_category: input.goal.category || 'General',
    goal_description: input.goal.description || 'No description provided',
    success_definition: input.goal.success_definition || 'Not defined',
    duration_days: input.goal.duration_days,
    actual_days: actualDays,
    goal_created_at: goalCreated.toLocaleDateString(),
    mentee_name: input.menteeDisplayName,
    mentor_name: input.mentorDisplayName || 'Self-directed',
    collaboration_started_at: input.collaboration?.started_at
      ? new Date(input.collaboration.started_at).toLocaleDateString()
      : 'N/A',
    collaboration_completed_at: input.collaboration?.completed_at
      ? new Date(input.collaboration.completed_at).toLocaleDateString()
      : 'Ongoing',
    milestone_count: input.milestones.length,
    completed_milestones: completedMilestones,
    milestones_text: milestonesText,
    focus_count: input.focuses.length,
    focuses_text: focusesText,
    action_item_count: input.actionItems.length,
    completed_items: completedItems,
    action_items_text: actionItemsText,
    check_in_count: input.checkIns.length,
    average_mood: averageMood,
    check_ins_text: checkInsText,
  }
}

/**
 * Generate goal completion summary using AI
 *
 * @param goalId - The ID of the goal to summarize
 * @returns Promise resolving to the completion summary
 * @throws Error if AI processing fails or returns invalid data
 *
 * @example
 * ```typescript
 * const summary = await generateCompletionSummary('goal-uuid')
 * console.log(summary.final_summary)
 * console.log(summary.key_achievements)
 * ```
 */
export async function generateCompletionSummary(
  goalId: string
): Promise<GoalCompletionSummary> {
  const openAIApiKey = process.env.OPENAI_API_KEY
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  // Gather context
  const context = await gatherCompletionContext(goalId)
  const formattedContext = formatSummaryContextForPrompt(context)

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.7, // Slightly higher for more creative summary
    openAIApiKey,
    timeout: 60000,
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', summarySystemPrompt],
    ['human', summaryUserPromptTemplate],
  ])

  const parser = new JsonOutputParser<GoalCompletionSummary>()
  const chain = prompt.pipe(model).pipe(parser)

  try {
    const result = await chain.invoke(formattedContext)

    // Ensure result is an object, not a string
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result

    // Validate the result against the schema
    const validated = GoalCompletionSummarySchema.parse(parsedResult)

    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Completion Agent validation error:', error.errors)
      throw new Error(
        `Invalid completion summary: ${error.errors.map((e) => e.message).join(', ')}`
      )
    }

    if (
      error instanceof SyntaxError ||
      (error instanceof Error &&
        (error.message.includes('JSON') || error.message.includes('parse')))
    ) {
      console.error('JSON parsing error in Completion Agent:', error)
      throw new Error(
        'Failed to parse completion summary JSON. The AI response was invalid. Please try again.'
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('Completion summary generation timed out. Please try again.')
      }
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('OpenAI API key is invalid or expired')
      }
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.')
      }
      throw error
    }

    console.error('Error generating completion summary:', error)
    throw new Error(
      `Failed to generate completion summary: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generate LinkedIn achievement post using AI
 *
 * @param goalId - The ID of the goal
 * @param summary - The completion summary (from generateCompletionSummary)
 * @param menteeReflection - Optional mentee reflection text
 * @returns Promise resolving to the LinkedIn post
 */
export async function generateLinkedInPost(
  goalId: string,
  summary: GoalCompletionSummary,
  menteeReflection?: string
): Promise<LinkedInPost> {
  const openAIApiKey = process.env.OPENAI_API_KEY
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  // Gather context
  const context = await gatherCompletionContext(goalId)

  // Format achievements and skills for prompt
  const achievementsText = summary.key_achievements
    .slice(0, 3)
    .map((a) => `- ${a.title}: ${a.description}`)
    .join('\n')

  const skillsText = summary.skills_developed
    .slice(0, 3)
    .map((s) => `- ${s.skill} (${s.level})`)
    .join('\n')

  // Calculate duration text
  const startDate = context.collaboration?.started_at || context.goal.created_at
  const durationDays = Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  const durationText =
    durationDays > 30
      ? `${Math.round(durationDays / 30)} months`
      : `${durationDays} days`

  const formattedContext = {
    goal_title: context.goal.title,
    goal_category: context.goal.category || 'General',
    goal_description: context.goal.description || 'No description',
    duration_text: durationText,
    mentee_name: context.menteeDisplayName,
    mentor_name: context.mentorDisplayName || 'Self-directed',
    achievements_text: achievementsText || 'Multiple key achievements',
    skills_text: skillsText || 'Various professional skills',
    mentee_reflection: menteeReflection || 'No reflection provided',
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.8, // Higher temperature for more creative post
    openAIApiKey,
    timeout: 30000,
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', linkedInSystemPrompt],
    ['human', linkedInUserPromptTemplate],
  ])

  const parser = new JsonOutputParser<LinkedInPost>()
  const chain = prompt.pipe(model).pipe(parser)

  try {
    const result = await chain.invoke(formattedContext)

    // Ensure result is an object, not a string
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result

    // Validate the result against the schema
    const validated = LinkedInPostSchema.parse(parsedResult)

    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('LinkedIn Post validation error:', error.errors)
      throw new Error(
        `Invalid LinkedIn post: ${error.errors.map((e) => e.message).join(', ')}`
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('LinkedIn post generation timed out. Please try again.')
      }
      throw error
    }

    console.error('Error generating LinkedIn post:', error)
    throw new Error(
      `Failed to generate LinkedIn post: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Save completion summary to database
 */
export async function saveCompletionSummary(
  goalCompletionId: string,
  summary: GoalCompletionSummary
): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('goal_completions')
    .update({
      final_summary: summary.final_summary,
    })
    .eq('id', goalCompletionId)

  if (error) {
    throw new Error(`Failed to save completion summary: ${error.message}`)
  }
}

/**
 * Save LinkedIn post to database
 */
export async function saveLinkedInPost(
  goalCompletionId: string,
  post: LinkedInPost
): Promise<void> {
  const supabase = createServiceClient()

  // Store the emoji version as it's more engaging
  const { error } = await supabase
    .from('goal_completions')
    .update({
      linkedin_post_text: `${post.emoji_version}\n\n${post.hashtags.join(' ')}`,
    })
    .eq('id', goalCompletionId)

  if (error) {
    throw new Error(`Failed to save LinkedIn post: ${error.message}`)
  }
}

/**
 * Generate summary and LinkedIn post, and save to database
 */
export async function generateAndSaveCompletionContent(
  goalId: string,
  goalCompletionId: string,
  menteeReflection?: string
): Promise<{
  summary: GoalCompletionSummary
  linkedInPost: LinkedInPost
}> {
  // Generate summary first
  const summary = await generateCompletionSummary(goalId)

  // Save summary
  await saveCompletionSummary(goalCompletionId, summary)

  // Generate LinkedIn post using the summary
  const linkedInPost = await generateLinkedInPost(goalId, summary, menteeReflection)

  // Save LinkedIn post
  await saveLinkedInPost(goalCompletionId, linkedInPost)

  return { summary, linkedInPost }
}
