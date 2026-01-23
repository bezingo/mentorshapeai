import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'

/**
 * Input interface for the Goal Shaper Agent
 */
export interface GoalShapingInput {
  title: string
  duration_days: 30 | 60
  current_challenges?: string
  category?: string
  description?: string
  existing_success_definition?: string
}

/**
 * Schema for milestone data returned by the Goal Shaper Agent
 */
const MilestoneSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(1000),
  relative_day_offset: z.number().int().min(0).max(60),
})

/**
 * Schema for risk-mitigation pairs returned by the Goal Shaper Agent
 */
const RiskPitfallSchema = z.object({
  risk: z.string(),
  mitigation: z.string(),
})

/**
 * Schema for goal shaped data returned by the Goal Shaper Agent
 * Matches the expected output structure from the AI agent
 */
export const GoalShapedDataSchema = z.object({
  refined_goal_statement: z.string().max(500),
  success_definition: z.string().min(1),
  milestones: z.array(MilestoneSchema).min(3).max(7),
  suggested_questions_for_mentor: z.array(z.string()).min(5).max(8),
  risks_or_pitfalls: z.array(RiskPitfallSchema),
})

export type GoalShapedData = z.infer<typeof GoalShapedDataSchema>

const systemPrompt = `You are a coaching assistant that helps people clarify goals into concrete milestones and success criteria.
You always think in terms of 30–60 day outcomes, not vague aspirations.
Your output is used to power a mentoring platform.

Guidelines:
- Transform vague goals into specific, actionable milestones
- Generate realistic milestones spaced throughout the time horizon (approximately one per week)
- For 30-day goals: generate 3-4 milestones
- For 60-day goals: generate 5-7 milestones
- Make success criteria measurable and specific
- Generate relevant questions that mentees should ask their mentors
- Identify realistic risks and provide actionable mitigation strategies
- Consider the goal category when generating milestones and questions
- If the user already provided a success definition, use it as context but don't repeat it verbatim`

const userPromptTemplate = `The mentee has written the following:

RAW_GOAL: {goal_text}
TIME_HORIZON_DAYS: {duration_days}
CURRENT_CHALLENGES: {challenges}
CATEGORY: {category}
DESCRIPTION: {description}
EXISTING_SUCCESS_DEFINITION: {existing_success_definition}

Based on this, return JSON with the following structure:

{{
  "refined_goal_statement": "A cleaned and clarified version of the goal, more specific and actionable than the original",
  "success_definition": "Measurable criteria for goal completion. Be specific and quantifiable. Only generate this if EXISTING_SUCCESS_DEFINITION is empty or null.",
  "milestones": [
    {{
      "title": "Short milestone title",
      "description": "Detailed explanation of what needs to be achieved",
      "relative_day_offset": 7
    }}
  ],
  "suggested_questions_for_mentor": [
    "Question 1",
    "Question 2"
  ],
  "risks_or_pitfalls": [
    {{
      "risk": "Potential obstacle or challenge",
      "mitigation": "How to address or prevent this risk"
    }}
  ]
}}

Requirements:
- Milestones must be realistic for the given time horizon
- Space milestones evenly throughout the duration (approximately one per week)
- relative_day_offset must be between 0 and TIME_HORIZON_DAYS
- Generate 3-4 milestones for 30-day goals, 5-7 for 60-day goals
- Success definition should be measurable and specific
- Questions should be relevant to the goal and challenges (generate 5-8 questions)
- Risks should be realistic and mitigations should be actionable
- If EXISTING_SUCCESS_DEFINITION is provided, use it as context but generate a refined version if needed
- Consider the CATEGORY when generating milestones (Career, Startup, Fitness, Learning, Personal Growth)`

/**
 * Shape a user-written goal into structured milestones, success criteria, and mentor questions
 * 
 * @param input - Goal shaping input containing title, duration, challenges, etc.
 * @returns Promise resolving to shaped goal data with milestones and questions
 * @throws Error if AI processing fails or returns invalid data
 * 
 * @example
 * ```typescript
 * const shaped = await shapeGoal({
 *   title: "Learn React",
 *   duration_days: 30,
 *   current_challenges: "No prior JavaScript experience",
 *   category: "Learning"
 * })
 * ```
 */
export async function shapeGoal(input: GoalShapingInput): Promise<GoalShapedData> {
  const openAIApiKey = process.env.OPENAI_API_KEY
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0,
    openAIApiKey,
    timeout: 30000, // 30 second timeout
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', userPromptTemplate],
  ])

  const parser = new JsonOutputParser<GoalShapedData>()
  const chain = prompt.pipe(model).pipe(parser)

  try {
    const result = await chain.invoke({
      goal_text: input.title,
      duration_days: input.duration_days,
      challenges: input.current_challenges || '',
      category: input.category || 'General',
      description: input.description || '',
      existing_success_definition: input.existing_success_definition || '',
    })

    // Validate the result against the schema
    const validated = GoalShapedDataSchema.parse(result)

    // Additional validation: ensure milestones respect time horizon
    const invalidMilestones = validated.milestones.filter(
      (m) => m.relative_day_offset < 0 || m.relative_day_offset > input.duration_days
    )

    if (invalidMilestones.length > 0) {
      console.warn(
        `Warning: ${invalidMilestones.length} milestone(s) have relative_day_offset outside time horizon`
      )
      // Filter out invalid milestones
      validated.milestones = validated.milestones.filter(
        (m) => m.relative_day_offset >= 0 && m.relative_day_offset <= input.duration_days
      )
    }

    // Ensure we have at least 3 milestones after filtering
    if (validated.milestones.length < 3) {
      throw new Error(
        `Invalid milestone count: expected at least 3, got ${validated.milestones.length}`
      )
    }

    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Goal Shaper validation error:', error.errors)
      throw new Error(`Invalid goal shaped data: ${error.errors.map((e) => e.message).join(', ')}`)
    }

    if (error instanceof Error) {
      // Check for specific OpenAI API errors
      if (error.message.includes('timeout')) {
        throw new Error('Goal shaping timed out after 30 seconds')
      }
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('OpenAI API key is invalid or expired')
      }
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.')
      }
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        throw new Error('Failed to connect to OpenAI API. Please check your internet connection.')
      }
      // Re-throw with original message if it's already descriptive
      if (error.message && error.message !== 'Failed to shape goal') {
        throw error
      }
    }

    console.error('Error shaping goal:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    throw new Error(`Failed to shape goal: ${errorMessage}`)
  }
}

