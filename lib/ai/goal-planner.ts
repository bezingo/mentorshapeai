import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages'
import { z } from 'zod'

/**
 * Schema for milestone preview data
 */
const MilestonePreviewSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(1000),
  relative_day_offset: z.number().int().min(0).max(60),
})

/**
 * Schema for goal planning state extracted from conversation
 */
export const GoalPlanningStateSchema = z.object({
  title: z.string().max(200).optional(),
  category: z.enum(['Finance', 'Career', 'Personal Growth', 'Entrepreneurship']).optional(),
  duration_days: z.union([z.literal(30), z.literal(60)]).optional(),
  description: z.string().optional(),
  success_definition: z.string().optional(),
  current_challenges: z.string().optional(),
  motivation: z.string().optional(), // Why they want to achieve this
  suggested_approach: z.string().optional(), // How to achieve it
  milestones_preview: z.array(MilestonePreviewSchema).optional(),
  conversation_complete: z.boolean(),
  missing_fields: z.array(z.string()),
  next_question: z.string().optional(), // What to ask next
})

export type GoalPlanningState = z.infer<typeof GoalPlanningStateSchema>

/**
 * Response from the Goal Planner Agent
 */
export interface GoalPlannerResponse {
  message: string // Conversational response to user
  state: GoalPlanningState // Current extracted information
  milestones_preview?: z.infer<typeof MilestonePreviewSchema>[] // If milestones can be generated
}

/**
 * System prompt for the Goal Planner Agent
 */
const systemPrompt = `You are a friendly and empathetic goal planning assistant helping users create clear, achievable goals for a mentoring platform.

Your role:
- Have natural, conversational interactions with users
- Extract goal information through friendly questions and active listening
- Help users clarify their goals by asking thoughtful follow-up questions
- Generate milestone previews when you have enough information
- Be encouraging and supportive

Information to extract:
1. Goal title (required) - What they want to achieve
2. Category (optional) - Finance, Career, Personal Growth, or Entrepreneurship
3. Duration (optional) - 30 or 60 days
4. Description (optional) - More details about the goal
5. Success definition (optional) - What success looks like
6. Current challenges (optional) - What's blocking them
7. Motivation (optional) - Why they want to achieve this goal
8. Suggested approach (optional) - How they might achieve it

Rules:
- Always respond conversationally, not like a form
- Ask one question at a time to avoid overwhelming the user
- Acknowledge what the user has shared before asking the next question
- Generate milestone previews (3-4 for 30 days, 5-7 for 60 days) when you have: title + (category OR duration OR challenges)
- Mark conversation_complete as true when you have: title + at least one other field
- Be warm, encouraging, and help users think through their goals
- If duration is not specified, ask about it before generating milestones
- Milestones should be realistic and spaced throughout the time horizon`

/**
 * User prompt template for structured extraction
 */
const extractionPromptTemplate = `Based on the conversation history above, extract the goal information and provide your next conversational response.

CURRENT USER MESSAGE: {input}

You must return a JSON object with TWO fields:
1. "message" - Your conversational response to the user (be friendly, acknowledge what they shared, ask follow-ups naturally)
2. All the extraction fields below

Extract information from the conversation and respond naturally. Return JSON with this structure (use double curly braces for literal braces):

JSON Structure:
- message: string (your conversational response)
- title: string or null (extracted goal title)
- category: string or null (Finance, Career, Personal Growth, or Entrepreneurship)
- duration_days: number or null (30 or 60)
- description: string or null (additional details)
- success_definition: string or null (what success looks like)
- current_challenges: string or null (challenges or blockers)
- motivation: string or null (why they want to achieve this)
- suggested_approach: string or null (how they might achieve it)
- milestones_preview: array or null (array of objects with title, description, relative_day_offset)
- conversation_complete: boolean (true when you have title + at least one other field)
- missing_fields: array of strings (helpful but not required fields)
- next_question: string or null (what to ask next if conversation not complete)

Guidelines:
- Extract information naturally from the conversation
- Only include milestones_preview if you have title + (category OR duration OR challenges) AND duration is specified
- For milestones: 3-4 for 30 days, 5-7 for 60 days
- Space milestones evenly (approximately one per week)
- Set conversation_complete to true when you have title + at least one other field
- List missing fields that would be helpful but aren't required
- Your "message" should be conversational and friendly, acknowledging what they shared and asking follow-ups naturally`

/**
 * Conversation history storage (in-memory for now)
 */
export interface ConversationHistory {
  messages: BaseMessage[]
  state: GoalPlanningState
  created_at: Date
}

/**
 * Initialize a new conversation session
 */
export function initializeGoalPlanning(): ConversationHistory {
  return {
    messages: [],
    state: {
      conversation_complete: false,
      missing_fields: [],
    },
    created_at: new Date(),
  }
}

/**
 * Process a user message and extract goal information
 * 
 * @param userMessage - The user's message
 * @param history - Conversation history
 * @returns Promise resolving to agent response with extracted state
 */
export async function processGoalPlanningMessage(
  userMessage: string,
  history: ConversationHistory
): Promise<GoalPlannerResponse> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.7, // Slightly higher for more natural conversation
    openAIApiKey: process.env.OPENAI_API_KEY,
    timeout: 30000, // 30 second timeout
  })

  // Check if OpenAI API key is set
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  // Create a prompt that includes conversation history
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    new MessagesPlaceholder('history'),
    ['human', extractionPromptTemplate],
  ])

  // Create parser for structured output (includes message field)
  const parser = new JsonOutputParser<GoalPlanningState & { message: string }>()
  
  // Create chain
  const chain = prompt.pipe(model).pipe(parser)

  try {
    // Add user message to history first
    const userMsg = new HumanMessage(userMessage)
    history.messages.push(userMsg)
    
    // Build messages array for the chain (all messages including the new user message)
    // MessagesPlaceholder expects an array of BaseMessage objects
    const messagesForChain = history.messages
    
    // Invoke chain with user message and history
    const result = await chain.invoke({
      input: userMessage,
      history: messagesForChain,
    })

    // Add AI response to history
    const aiMsg = new AIMessage(result.message || JSON.stringify(result))
    history.messages.push(aiMsg)

    // Transform null values to undefined for optional fields
    const transformedResult = {
      title: result.title ?? undefined,
      category: result.category ?? undefined,
      duration_days: result.duration_days ?? undefined,
      description: result.description ?? undefined,
      success_definition: result.success_definition ?? undefined,
      current_challenges: result.current_challenges ?? undefined,
      motivation: result.motivation ?? undefined,
      suggested_approach: result.suggested_approach ?? undefined,
      milestones_preview: result.milestones_preview ?? undefined,
      conversation_complete: result.conversation_complete ?? false,
      missing_fields: result.missing_fields ?? [],
      next_question: result.next_question ?? undefined,
    }

    // Validate the result
    const validatedState = GoalPlanningStateSchema.parse(transformedResult)

    // Update history state
    history.state = validatedState

    // Validate milestones if present
    let milestonesPreview: z.infer<typeof MilestonePreviewSchema>[] | undefined
    if (validatedState.milestones_preview && validatedState.milestones_preview.length > 0) {
      milestonesPreview = validatedState.milestones_preview.map((m) =>
        MilestonePreviewSchema.parse(m)
      )

      // Filter out invalid milestones (outside time horizon)
      if (validatedState.duration_days) {
        milestonesPreview = milestonesPreview.filter(
          (m) => m.relative_day_offset >= 0 && m.relative_day_offset <= validatedState.duration_days!
        )
      }
    }

    return {
      message: result.message || 'I understand. Let me help you plan your goal.',
      state: {
        ...validatedState,
        milestones_preview: milestonesPreview,
      },
      milestones_preview: milestonesPreview,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Goal Planner validation error:', error.errors)
      throw new Error(`Invalid goal planning state: ${error.errors.map((e) => e.message).join(', ')}`)
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('Goal planning conversation timed out after 30 seconds')
      }
      // Re-throw with original message for better debugging
      throw error
    }

    console.error('Error processing goal planning message:', error)
    throw new Error(`Failed to process goal planning message: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Convert GoalPlanningState to goal creation input
 */
export function planningStateToGoalInput(state: GoalPlanningState): {
  title: string
  category?: string
  duration_days?: 30 | 60
  description?: string
  success_definition?: string
  current_challenges?: string
  motivation?: string
  suggested_approach?: string
} {
  if (!state.title) {
    throw new Error('Goal title is required')
  }

  return {
    title: state.title,
    category: state.category,
    duration_days: state.duration_days,
    description: state.description,
    success_definition: state.success_definition,
    current_challenges: state.current_challenges,
    motivation: state.motivation,
    suggested_approach: state.suggested_approach,
  }
}

