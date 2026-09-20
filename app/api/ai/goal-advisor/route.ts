import { streamText, tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { getCurrentProfile, requireMentee } from '@/lib/clerk'
import { 
  buildGoalContext, 
  getOrCreateConversation,
  saveMessage,
  getGoalOwnerId
} from '@/lib/ai/goal-context-builder'
import { buildSystemPrompt, INITIAL_MESSAGE } from '@/lib/ai/goal-advisor-prompt'
import {
  refineGoalAspects,
  analyzeGoal,
  bookCalendar,
  exportGoalToNotion,
  exportGoalToGoogleDocs,
  searchMemory,
  findMentors
} from '@/lib/ai/goal-advisor-tools'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Goal Advisor Chat API
 * 
 * Streaming conversational AI for goal refinement and mentoring.
 * Uses Vercel AI SDK with OpenAI and LangChain tools.
 */
export async function POST(req: Request) {
  try {
    console.log('🔵 Goal Advisor API called')
    await requireMentee()
    const profile = await getCurrentProfile()
    
    if (!profile) {
      console.log('❌ Unauthorized - no profile')
      return new Response('Unauthorized', { status: 401 })
    }
    
    const body = await req.json()
    console.log('📦 Request body:', JSON.stringify(body, null, 2))
    
    const { messages, goalId, conversationId: clientConversationId } = body
    
    if (!goalId) {
      console.log('❌ No goal ID provided')
      return new Response('Goal ID required', { status: 400 })
    }
    
    if (!messages || !Array.isArray(messages)) {
      console.log('❌ Invalid messages format:', messages)
      return new Response('Messages array required', { status: 400 })
    }
    
    console.log('✅ Goal ID:', goalId, 'Messages count:', messages.length)
    
    // Verify user owns this goal
    const goalOwnerId = await getGoalOwnerId(goalId)
    if (goalOwnerId !== profile.id) {
      console.log('❌ Unauthorized - user does not own goal')
      return new Response('Unauthorized - not your goal', { status: 403 })
    }
    
    // Get or create conversation
    const conversationId = clientConversationId || 
      await getOrCreateConversation(goalId, profile.id)
    
    console.log('💬 Conversation ID:', conversationId)
    
    // Build goal context
    const context = await buildGoalContext(goalId, conversationId)
    
    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context)
    
    // If first message, prepend initial greeting
    let chatMessages = messages
    if (!clientConversationId && messages.length === 0) {
      chatMessages = [
        { role: 'assistant', content: INITIAL_MESSAGE }
      ]
    }
    
    console.log('🚀 Starting streamText with', chatMessages.length, 'messages')
    
    // Save user message if present
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'user') {
      await saveMessage(
        conversationId,
        'user',
        lastMessage.content
      )
    }
    
    // Stream response with AI SDK
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatMessages
      ],
      temperature: 0.7,
      tools: {
        refineGoal: tool({
          description: 'Refine specific aspects of the goal using AI Goal Shaper. Use when user wants to improve clarity, milestones, success criteria, or questions for mentors.',
          inputSchema: z.object({
            aspects: z.array(z.enum([
              'statement',
              'milestones',
              'success_criteria',
              'questions',
              'risks',
              'all'
            ])).describe('Which aspects to refine')
          }),
          execute: async ({ aspects }: { aspects: string[] }) => {
            const result = await refineGoalAspects(goalId, aspects)
            return result
          }
        }),
        
        analyzeGoal: tool({
          description: 'Run strategic analysis on the goal. SWOT provides Strengths, Weaknesses, Opportunities, Threats. SMART checks if goal is Specific, Measurable, Achievable, Relevant, Time-bound.',
          inputSchema: z.object({
            type: z.enum(['swot', 'smart']).describe('Type of analysis')
          }),
          execute: async ({ type }: { type: 'swot' | 'smart' }) => {
            const result = await analyzeGoal(goalId, type)
            return result
          }
        }),
        
        bookCalendar: tool({
          description: 'Schedule a calendar event with a mentor via Pipedream integration.',
          inputSchema: z.object({
            mentorEmail: z.string().email().describe('Email address of the mentor'),
            datetime: z.string().describe('ISO 8601 datetime for the meeting'),
            duration: z.number().describe('Duration in minutes')
          }),
          execute: async (params: { mentorEmail: string; datetime: string; duration: number }) => {
            const result = await bookCalendar({
              goalId,
              ...params
            })
            return result
          }
        }),
        
        exportToNotion: tool({
          description: 'Export goal to Notion workspace. Creates a formatted page with goal details.',
          inputSchema: z.object({
            pageId: z.string().default('').describe('Notion page ID (empty for default location)')
          }),
          execute: async ({ pageId }: { pageId: string }) => {
            const result = await exportGoalToNotion(goalId, pageId || undefined)
            return result
          }
        }),
        
        exportToGoogleDocs: tool({
          description: 'Export goal to Google Docs. Creates a formatted document with goal details.',
          inputSchema: z.object({
            folderId: z.string().default('').describe('Google Drive folder ID (empty for default)')
          }),
          execute: async ({ folderId }: { folderId: string }) => {
            const result = await exportGoalToGoogleDocs(goalId, folderId || undefined)
            return result
          }
        }),
        
        searchMemory: tool({
          description: 'Search through attached files and links in this conversation.',
          inputSchema: z.object({
            query: z.string().describe('Search query to find in attached resources')
          }),
          execute: async ({ query }: { query: string }) => {
            const result = await searchMemory(conversationId, query)
            return result
          }
        }),
        
        findMentors: tool({
          description:
            'Find ranked mentor matches with fit scores based on alumni, location, languages, work alignment, and interests.',
          inputSchema: z.object({
            skills: z.array(z.string()).describe('Skills or expertise areas to match')
          }),
          execute: async ({ skills }: { skills: string[] }) => {
            const result = await findMentors(goalId, skills)
            return result
          }
        })
      },
      onFinish: async ({ text, toolCalls }) => {
        // Save assistant message to database
        await saveMessage(
          conversationId,
          'assistant',
          text,
          toolCalls || undefined
        )
      }
    })
    
    // Add conversation ID to response headers
    const response = result.toTextStreamResponse()
    
    // Create a new response with the conversation ID header
    return new Response(response.body, {
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'X-Conversation-Id': conversationId
      }
    })
    
  } catch (error) {
    console.error('Goal Advisor API error:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Internal server error'
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
