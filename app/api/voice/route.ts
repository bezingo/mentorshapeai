import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

/**
 * Voice API endpoint for push-to-talk
 * 
 * IMPORTANT: This endpoint NEVER stores audio blobs
 * - Receives text transcribed by the client (Web Speech API)
 * - Processes through the agent
 * - Returns text response (client handles TTS)
 * 
 * Audio is processed in-session and discarded
 */

const VoiceInputSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  context: z.enum(['goal', 'collab', 'general']).optional().default('general'),
  goal_id: z.string().uuid().optional(),
  collaboration_id: z.string().uuid().optional(),
  language: z.enum(['en', 'ar']).optional().default('en'),
})

export async function POST(request: NextRequest) {
  try {
    // Reject any audio uploads - we only accept text
    const contentType = request.headers.get('content-type') || ''
    if (
      contentType.includes('audio') ||
      contentType.includes('multipart/form-data')
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'AUDIO_NOT_ACCEPTED',
            message: 'This endpoint does not accept audio uploads. Use client-side STT.',
          },
        },
        { status: 400 }
      )
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = VoiceInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parsed.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const { text, context, goal_id, collaboration_id, language } = parsed.data

    const supabase = createServiceClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    // Process through agent (simplified - in production would call goal planner or agent)
    const response = await processVoiceMessage({
      text,
      context,
      goalId: goal_id,
      collaborationId: collaboration_id,
      profileId: profile.id,
      language,
    })

    return NextResponse.json({
      success: true,
      data: {
        response: response.text,
        action: response.action,
      },
    })
  } catch (error) {
    console.error('Voice API error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process voice input',
        },
      },
      { status: 500 }
    )
  }
}

interface ProcessVoiceParams {
  text: string
  context: string
  goalId?: string
  collaborationId?: string
  profileId: string
  language: string
}

interface VoiceResponse {
  text: string
  action?: {
    type: 'create_task' | 'create_goal' | 'schedule_focus' | 'message'
    data?: Record<string, unknown>
  }
}

async function processVoiceMessage(params: ProcessVoiceParams): Promise<VoiceResponse> {
  const { text, context, language } = params

  // Simple keyword-based routing for demo
  // In production, this would call the AI agent
  const lowerText = text.toLowerCase()

  // Task creation keywords
  const taskKeywords = ['remind me', 'add task', 'create task', 'todo', 'أضف مهمة', 'ذكرني']
  if (taskKeywords.some((k) => lowerText.includes(k))) {
    const responseText = language === 'ar' 
      ? 'تم إضافة المهمة إلى قائمتك.'
      : "I've added that task to your list."
    return {
      text: responseText,
      action: {
        type: 'create_task',
        data: { title: text },
      },
    }
  }

  // Goal keywords
  const goalKeywords = ['new goal', 'create goal', 'هدف جديد', 'إنشاء هدف']
  if (goalKeywords.some((k) => lowerText.includes(k))) {
    const responseText = language === 'ar'
      ? 'رائع! دعني أساعدك في إنشاء هذا الهدف.'
      : "Great! Let me help you set up this goal."
    return {
      text: responseText,
      action: {
        type: 'create_goal',
        data: { context: text },
      },
    }
  }

  // Default response
  const defaultResponse = language === 'ar'
    ? 'فهمت. كيف يمكنني مساعدتك في هذا؟'
    : "I understand. How can I help you with that?"

  return {
    text: defaultResponse,
    action: {
      type: 'message',
      data: { original: text },
    },
  }
}

// GET endpoint to verify no audio storage is happening
export async function GET() {
  return NextResponse.json({
    info: 'Voice API - No audio storage',
    accepts: 'text only',
    storage: 'none',
    note: 'Audio is processed client-side and never uploaded',
  })
}
