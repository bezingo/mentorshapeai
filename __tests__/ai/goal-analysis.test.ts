/**
 * Goal Analysis AI Agent Tests
 *
 * These tests validate the AI analysis agent functions.
 * Tests cover SWOT analysis, SMART framework, and mentor notes generation.
 *
 * NOTE: These tests require OPENAI_API_KEY environment variable.
 * Set OPENAI_API_KEY for AI agent tests (or they will be skipped).
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import {
  generateSWOTAnalysis,
  generateSMARTFramework,
  generateMentorNotes,
  SWOTAnalysisSchema,
  SMARTFrameworkSchema,
  SWOTAnalysisInput,
  SMARTFrameworkInput,
  MentorNotesInput,
} from '@/lib/ai/goal-analysis'

// Mock LangChain modules
vi.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: vi.fn().mockImplementation(() => ({
      invoke: vi.fn(async (prompt: any) => {
        const input = prompt.lc_kwargs?.messages?.[1]?.content || ''

        // Mock SWOT response
        if (input.includes('SWOT') || input.includes('strengths')) {
          return {
            content: JSON.stringify({
              strengths: ['Strength 1', 'Strength 2'],
              weaknesses: ['Weakness 1', 'Weakness 2'],
              opportunities: ['Opportunity 1', 'Opportunity 2'],
              threats: ['Threat 1', 'Threat 2'],
            }),
          }
        }

        // Mock SMART response
        if (input.includes('SMART') || input.includes('Specific')) {
          return {
            content: JSON.stringify({
              specific: 'Specific goal statement with clear objectives',
              measurable: 'Measurable criteria for success including metrics and KPIs',
              achievable: 'Assessment of feasibility and required resources',
              relevant: 'Alignment with broader objectives and personal values',
              time_bound: 'Clear timeline with milestones and deadline',
            }),
          }
        }

        // Mock mentor notes response
        return {
          content:
            'This mentee is working on a goal to improve their skills. Key areas for mentorship include building foundational knowledge, developing practical skills, and maintaining motivation. The mentee has identified specific challenges and is committed to achieving their goal within the specified timeframe.',
        }
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
              if (parser) {
                return parser.parse(result.content)
              }
              return result
            },
          })),
        })),
      })),
    },
  }
})

const openaiApiKey = process.env.OPENAI_API_KEY
const shouldRunAITests = !!openaiApiKey

describe.skipIf(!shouldRunAITests)('Goal Analysis AI Agent', () => {
  beforeAll(() => {
    process.env.OPENAI_API_KEY = 'test-key'
  })

  describe('generateSWOTAnalysis', () => {
    it('should generate SWOT analysis with all four categories', async () => {
      const input: SWOTAnalysisInput = {
        title: 'Learn React',
        description: 'Master React fundamentals',
        current_challenges: 'No prior experience',
        milestones: [
          { title: 'Week 1', description: 'Learn basics' },
          { title: 'Week 2', description: 'Build project' },
        ],
        category: 'Learning',
      }

      const result = await generateSWOTAnalysis(input)

      expect(result).toBeDefined()
      expect(result.strengths).toBeInstanceOf(Array)
      expect(result.weaknesses).toBeInstanceOf(Array)
      expect(result.opportunities).toBeInstanceOf(Array)
      expect(result.threats).toBeInstanceOf(Array)
      expect(result.strengths.length).toBeGreaterThanOrEqual(2)
      expect(SWOTAnalysisSchema.parse(result)).toEqual(result)
    })

    it('should handle missing optional fields gracefully', async () => {
      const input: SWOTAnalysisInput = {
        title: 'Improve Fitness',
      }

      const result = await generateSWOTAnalysis(input)

      expect(result).toBeDefined()
      expect(result.strengths.length).toBeGreaterThanOrEqual(2)
      expect(SWOTAnalysisSchema.parse(result)).toEqual(result)
    })
  })

  describe('generateSMARTFramework', () => {
    it('should generate SMART framework with all five criteria', async () => {
      const input: SMARTFrameworkInput = {
        title: 'Launch SaaS Product',
        description: 'Build and launch a SaaS product',
        success_definition: '100 paying customers',
        duration_days: 60,
        category: 'Startup',
      }

      const result = await generateSMARTFramework(input)

      expect(result).toBeDefined()
      expect(result.specific).toBeDefined()
      expect(result.measurable).toBeDefined()
      expect(result.achievable).toBeDefined()
      expect(result.relevant).toBeDefined()
      expect(result.time_bound).toBeDefined()
      expect(SMARTFrameworkSchema.parse(result)).toEqual(result)
    })

    it('should handle 30-day and 60-day goals differently', async () => {
      const input30: SMARTFrameworkInput = {
        title: 'Quick Goal',
        duration_days: 30,
      }

      const input60: SMARTFrameworkInput = {
        title: 'Long Goal',
        duration_days: 60,
      }

      const result30 = await generateSMARTFramework(input30)
      const result60 = await generateSMARTFramework(input60)

      expect(result30.time_bound).toContain('30')
      expect(result60.time_bound).toContain('60')
    })
  })

  describe('generateMentorNotes', () => {
    it('should generate comprehensive mentor notes', async () => {
      const input: MentorNotesInput = {
        title: 'Career Advancement',
        description: 'Advance to senior role',
        current_challenges: 'Lack of leadership experience',
        success_definition: 'Promoted to senior position',
        milestones: [
          { title: 'Month 1', description: 'Complete leadership course' },
        ],
        category: 'Career',
      }

      const result = await generateMentorNotes(input)

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(300)
      expect(result.length).toBeLessThan(2000)
    })

    it('should include SWOT and SMART insights when available', async () => {
      const input: MentorNotesInput = {
        title: 'Learn TypeScript',
        swot_analysis: {
          strengths: ['Strong JavaScript knowledge'],
          weaknesses: ['No TypeScript experience'],
          opportunities: ['Growing demand'],
          threats: ['Time constraints'],
        },
        smart_framework: {
          specific: 'Master TypeScript',
          measurable: 'Complete 5 projects',
          achievable: 'With daily practice',
          relevant: 'Career advancement',
          time_bound: '30 days',
        },
      }

      const result = await generateMentorNotes(input)

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(300)
    })
  })
})


