/**
 * Goal Planner Agent Tests
 *
 * These tests validate the Goal Planner Agent's conversational extraction logic.
 * Tests cover information extraction, milestone generation, and completion detection.
 *
 * NOTE: These tests require OPENAI_API_KEY environment variable.
 * Set OPENAI_API_KEY for AI agent tests (or they will be skipped).
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import {
  initializeGoalPlanning,
  processGoalPlanningMessage,
  planningStateToGoalInput,
  GoalPlanningStateSchema,
  ConversationHistory,
} from '@/lib/ai/goal-planner'

// Mock LangChain modules
vi.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: vi.fn().mockImplementation(() => ({
      invoke: vi.fn(async (prompt: any) => {
        // Extract user message from prompt
        const messages = prompt.lc_kwargs?.messages || []
        const userMessage = messages.find((m: any) => m._getType() === 'human')?.content || ''
        const history = messages.filter((m: any) => m._getType() !== 'human')

        // Simulate AI extraction based on user message
        let title: string | undefined
        let category: string | undefined
        let duration_days: 30 | 60 | undefined
        let description: string | undefined
        let challenges: string | undefined
        let motivation: string | undefined

        // Extract title if mentioned
        if (userMessage.toLowerCase().includes('learn') || userMessage.toLowerCase().includes('goal')) {
          title = 'Learn React Basics'
        } else if (userMessage.toLowerCase().includes('career')) {
          title = 'Advance Career'
          category = 'Career'
        } else if (userMessage.toLowerCase().includes('finance')) {
          title = 'Master Finance'
          category = 'Finance'
        }

        // Extract duration
        if (userMessage.includes('30') || userMessage.toLowerCase().includes('month')) {
          duration_days = 30
        } else if (userMessage.includes('60') || userMessage.toLowerCase().includes('two months')) {
          duration_days = 60
        }

        // Extract challenges
        if (userMessage.toLowerCase().includes('challenge') || userMessage.toLowerCase().includes('difficult')) {
          challenges = 'Lack of experience'
        }

        // Extract motivation
        if (userMessage.toLowerCase().includes('why') || userMessage.toLowerCase().includes('want')) {
          motivation = 'To advance my career'
        }

        const hasEnoughInfo = title && (category || duration_days || challenges)
        const conversationComplete = !!title && (!!category || !!duration_days || !!challenges)

        // Generate milestones if we have enough info
        let milestones: any[] = []
        if (hasEnoughInfo && duration_days) {
          const count = duration_days === 30 ? 4 : 6
          for (let i = 0; i < count; i++) {
            milestones.push({
              title: `Milestone ${i + 1}`,
              description: `Complete milestone ${i + 1}`,
              relative_day_offset: Math.floor((duration_days / count) * (i + 1)),
            })
          }
        }

        const response = {
          message: conversationComplete
            ? 'Great! I have enough information to help you plan your goal.'
            : 'Thanks for sharing! Can you tell me more about...',
          title: title || null,
          category: category || null,
          duration_days: duration_days || null,
          description: description || null,
          current_challenges: challenges || null,
          motivation: motivation || null,
          suggested_approach: null,
          milestones_preview: milestones.length > 0 ? milestones : null,
          conversation_complete: conversationComplete,
          missing_fields: conversationComplete ? [] : ['duration', 'category'],
          next_question: conversationComplete ? null : 'What is your target timeline?',
        }

        return { content: JSON.stringify(response) }
      }),
    })),
  }
})

vi.mock('@langchain/core/output_parsers', () => {
  return {
    JsonOutputParser: vi.fn().mockImplementation(() => ({
      parse: (content: string) => {
        if (typeof content === 'string') {
          return JSON.parse(content)
        }
        return content
      },
    })),
  }
})

vi.mock('@langchain/core/prompts', () => {
  return {
    ChatPromptTemplate: {
      fromMessages: vi.fn(() => ({
        pipe: vi.fn(() => ({
          pipe: vi.fn((parser: any) => ({
            invoke: async (input: any) => {
              const model = await import('@langchain/openai').then((m) => new m.ChatOpenAI())
              const result = await model.invoke(input)
              const parsed = parser.parse(result.content)
              return parsed
            },
          })),
        })),
      })),
    },
    MessagesPlaceholder: vi.fn(() => ({})),
  }
})

vi.mock('@langchain/core/messages', () => {
  return {
    HumanMessage: vi.fn((content: string) => ({
      content,
      _getType: () => 'human',
    })),
    AIMessage: vi.fn((content: string) => ({
      content,
      _getType: () => 'ai',
    })),
  }
})

const openaiApiKey = process.env.OPENAI_API_KEY
const shouldRunAITests = !!openaiApiKey

describe.skipIf(!shouldRunAITests)('Goal Planner Agent', () => {
  let history: ConversationHistory

  beforeAll(() => {
    process.env.OPENAI_API_KEY = 'test-key'
  })

  beforeEach(() => {
    history = initializeGoalPlanning()
  })

  it('should extract goal title from user message', async () => {
    const response = await processGoalPlanningMessage('I want to learn React', history)

    expect(response.state.title).toBeDefined()
    expect(response.message).toBeDefined()
    expect(GoalPlanningStateSchema.parse(response.state)).toEqual(response.state)
  })

  it('should extract category and duration from conversation', async () => {
    await processGoalPlanningMessage('I want to advance my career', history)
    const response = await processGoalPlanningMessage('I want to do this in 30 days', history)

    expect(response.state.category).toBe('Career')
    expect(response.state.duration_days).toBe(30)
  })

  it('should generate milestones when enough information is available', async () => {
    await processGoalPlanningMessage('I want to learn React', history)
    const response = await processGoalPlanningMessage('I want to do this in 30 days and I have no prior experience', history)

    expect(response.milestones_preview).toBeDefined()
    if (response.milestones_preview) {
      expect(response.milestones_preview.length).toBeGreaterThanOrEqual(3)
      expect(response.milestones_preview.length).toBeLessThanOrEqual(4) // 30-day goal
    }
  })

  it('should mark conversation as complete when title + other field is present', async () => {
    await processGoalPlanningMessage('I want to learn React', history)
    const response = await processGoalPlanningMessage('I want to do this in 30 days', history)

    expect(response.state.conversation_complete).toBe(true)
  })

  it('should convert planning state to goal input correctly', () => {
    const state = {
      title: 'Build Finance Plan',
      category: 'Finance' as const,
      duration_days: 30 as const,
      description: 'Create a budget and investment strategy',
      current_challenges: 'No experience',
      conversation_complete: true,
      missing_fields: [],
    }

    const goalInput = planningStateToGoalInput(state)

    expect(goalInput.title).toBe('Build Finance Plan')
    expect(goalInput.category).toBe('Finance')
    expect(goalInput.duration_days).toBe(30)
    expect(goalInput.description).toBe('Create a budget and investment strategy')
    expect(goalInput.current_challenges).toBe('No experience')
  })

  it('should throw error if title is missing when converting to goal input', () => {
    const state = {
      conversation_complete: false,
      missing_fields: ['title'],
    }

    expect(() => planningStateToGoalInput(state as any)).toThrow('Goal title is required')
  })

  it('should maintain conversation history across messages', async () => {
    await processGoalPlanningMessage('I want to learn React', history)
    await processGoalPlanningMessage('I have no prior experience', history)
    const response = await processGoalPlanningMessage('I want to do this in 30 days', history)

    expect(history.messages.length).toBeGreaterThan(0)
    expect(response.state.title).toBeDefined()
    expect(response.state.current_challenges).toBeDefined()
  })
})

