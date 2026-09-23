import { NextResponse } from 'next/server'
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai'
import { openai } from '@ai-sdk/openai'
import { ensureUserAndProfile, requireAuth } from '@/lib/clerk'
import { buildOnboardingSystemPrompt } from '@/lib/journey/onboarding-system-prompt'
import {
  assertJourneyConversationOwnedByProfile,
  getLatestJourneyConversationForProfile,
  getOrCreateJourneyConversation,
  loadJourneyConversationHistory,
  saveJourneyMessage,
} from '@/lib/journey/journey-conversation'
import { createJourneyServerTools } from '@/lib/journey/journey-server-tools'

export const runtime = 'nodejs'
export const maxDuration = 60

function getTextFromUIMessage(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim()
}

export async function GET() {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const conversationId =
      (await getLatestJourneyConversationForProfile(profile.id)) ??
      (await getOrCreateJourneyConversation(profile.id))

    const history = await loadJourneyConversationHistory(conversationId)

    return NextResponse.json({
      data: {
        conversationId,
        messages: history.map((row) => ({
          id: row.id,
          role: row.role,
          content: row.content,
        })),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }
    console.error('GET /api/journey/chat:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load conversation' } },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()
    if (!profile?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = (await req.json()) as {
      messages: UIMessage[]
      conversationId?: string
    }

    const { messages } = body
    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array required', { status: 400 })
    }

    let conversationId = body.conversationId
    if (conversationId) {
      try {
        await assertJourneyConversationOwnedByProfile(conversationId, profile.id)
      } catch {
        return new Response('Forbidden', { status: 403 })
      }
    } else {
      conversationId = await getOrCreateJourneyConversation(profile.id)
    }

    const now = new Date()
    const systemPrompt = buildOnboardingSystemPrompt(now)
    const tools = createJourneyServerTools({ profileId: profile.id, now })

    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser) {
      const text = getTextFromUIMessage(lastUser)
      if (text) {
        await saveJourneyMessage(conversationId, 'user', text)
      }
    }

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(12),
      temperature: 0.7,
      onFinish: async ({ text, toolCalls }) => {
        if (text || toolCalls?.length) {
          await saveJourneyMessage(
            conversationId!,
            'assistant',
            text || '(tool response)',
            toolCalls?.length ? toolCalls : undefined
          )
        }
      },
    })

    return result.toUIMessageStreamResponse({
      headers: {
        'X-Conversation-Id': conversationId,
      },
      messageMetadata: () => ({
        conversationId,
      }),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response('Unauthorized', { status: 401 })
    }
    console.error('POST /api/journey/chat:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
