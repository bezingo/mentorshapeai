import { NextResponse, NextRequest } from 'next/server'
import { requireMentee } from '@/lib/auth-helpers'
import { ensureUserAndProfile } from '@/lib/auth-helpers'
import {
  initializeGoalPlanning,
  processGoalPlanningMessage,
  planningStateToGoalInput,
  GoalPlanningStateSchema,
  GoalPlannerClientMessageSchema,
  GOAL_PLANNER_MAX_CLIENT_MESSAGES,
  conversationHistoryFromClient,
} from '@/lib/ai/goal-planner'
import { createServiceClient } from '@/lib/supabase/service'
import { generateUniqueSlug } from '@/lib/utils/slug'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const StartSessionSchema = z.object({})

const ChatMessageSchema = z.object({
  session_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
  state: GoalPlanningStateSchema,
  messages: z.array(GoalPlannerClientMessageSchema).max(GOAL_PLANNER_MAX_CLIENT_MESSAGES),
})

const CompleteGoalSchema = z.object({
  session_id: z.string().uuid(),
  status: z.enum(['draft', 'active']).default('draft'),
  state: GoalPlanningStateSchema,
})

/**
 * POST /api/ai/goal-planner?action=start
 * PUT /api/ai/goal-planner?action=chat
 * PATCH /api/ai/goal-planner?action=complete
 *
 * Stateless goal planning: the client sends planning state (+ message history for chat).
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'start'

  if (action === 'start') {
    return handleStartSession(request)
  }

  return NextResponse.json(
    { error: { code: 'INVALID_ACTION', message: 'Invalid action for POST method' } },
    { status: 400 }
  )
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'chat'

  if (action === 'chat') {
    return handleChatMessage(request)
  }

  return NextResponse.json(
    { error: { code: 'INVALID_ACTION', message: 'Invalid action for PUT method' } },
    { status: 400 }
  )
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'complete'

  if (action === 'complete') {
    return handleCompleteGoal(request)
  }

  return NextResponse.json(
    { error: { code: 'INVALID_ACTION', message: 'Invalid action for PATCH method' } },
    { status: 400 }
  )
}

async function handleStartSession(request: NextRequest) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => ({}))
    StartSessionSchema.parse(body)

    const sessionId = randomUUID()
    const session = initializeGoalPlanning()

    const initialMessage =
      "Hi! I'm here to help you plan your goal. What would you like to achieve?"

    return NextResponse.json({
      data: {
        session_id: sessionId,
        message: initialMessage,
        state: session.state,
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    console.error('Error starting goal planning session:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to start goal planning session' } },
      { status: 500 }
    )
  }
}

async function handleChatMessage(request: NextRequest) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { message, state, messages } = ChatMessageSchema.parse(body)

    const history = conversationHistoryFromClient(messages, state)

    let response
    try {
      response = await processGoalPlanningMessage(message, history)
    } catch (error: any) {
      if (error.message?.includes('timeout')) {
        return NextResponse.json(
          { error: { code: 'AI_TIMEOUT', message: 'AI request timed out. Please try again.' } },
          { status: 504 }
        )
      }

      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        return NextResponse.json(
          { error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded. Please try again later.' } },
          { status: 503, headers: { 'Retry-After': '60' } }
        )
      }

      console.error('Error processing goal planning message:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
      return NextResponse.json(
        { 
          error: { 
            code: 'AI_ERROR', 
            message: error.message || 'Failed to process message. Please try again.',
            details: process.env.NODE_ENV === 'development' ? String(error) : undefined
          } 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        message: response.message,
        state: response.state,
        milestones_preview: response.milestones_preview,
        is_complete: response.state.conversation_complete,
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    console.error('Error in goal planner chat:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process chat message' } },
      { status: 500 }
    )
  }
}

async function handleCompleteGoal(request: NextRequest) {
  try {
    await requireMentee()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { status, state } = CompleteGoalSchema.parse(body)

    if (!state.conversation_complete) {
      return NextResponse.json(
        {
          error: {
            code: 'INCOMPLETE_CONVERSATION',
            message: 'Not enough information collected. Please continue the conversation.',
            missing_fields: state.missing_fields,
          },
        },
        { status: 400 }
      )
    }

    const goalInput = planningStateToGoalInput(state)

    const serviceSupabase = createServiceClient()

    let publicSlug: string | null = null
    if (status === 'active') {
      publicSlug = await generateUniqueSlug(goalInput.title, async (slug) => {
        const { data } = await serviceSupabase
          .from('goals')
          .select('id')
          .eq('public_slug', slug)
          .single()
        return !data
      })
    }

    const { data: goal, error: goalError } = await serviceSupabase
      .from('goals')
      .insert({
        profile_id: profile.id,
        title: goalInput.title,
        description: goalInput.description,
        category: goalInput.category,
        duration_days: goalInput.duration_days,
        success_definition: goalInput.success_definition,
        current_challenges: goalInput.current_challenges,
        motivation: state.motivation,
        suggested_approach: state.suggested_approach,
        status: status,
        public_slug: publicSlug,
      })
      .select()
      .single()

    if (goalError) {
      console.error('Error creating goal:', goalError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: goalError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        goal,
        should_shape: true,
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    console.error('Error completing goal planning:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create goal' } },
      { status: 500 }
    )
  }
}
