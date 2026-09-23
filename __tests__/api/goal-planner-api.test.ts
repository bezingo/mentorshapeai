/**
 * Goal Planner API Tests
 *
 * Stateless flow: chat and complete carry planning state (+ message history) on each request.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { POST, PUT, PATCH } from '@/app/api/ai/goal-planner/route'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}))

vi.mock('@/lib/clerk', async () => {
  const actual = await vi.importActual('@/lib/clerk')
  return {
    ...actual,
    requireMentee: vi.fn(),
    ensureUserAndProfile: vi.fn(),
  }
})

const mockProcessGoalPlanningMessage = vi.fn(async (message: string, history: { state: unknown }) => {
  const hasTitle = message.toLowerCase().includes('learn') || message.toLowerCase().includes('goal')
  const hasDuration = message.includes('30') || message.includes('60')
  const hasCategory = message.toLowerCase().includes('career') || message.toLowerCase().includes('fitness')

  const nextState = {
    title: hasTitle ? 'Learn React' : (history.state as { title?: string })?.title,
    category: hasCategory ? 'Career' : (history.state as { category?: string })?.category,
    duration_days: hasDuration ? (message.includes('30') ? 30 : 60) : (history.state as { duration_days?: number })?.duration_days,
    conversation_complete: Boolean(
      (hasTitle || (history.state as { title?: string })?.title) &&
        (hasDuration ||
          hasCategory ||
          (history.state as { duration_days?: number; category?: string })?.duration_days ||
          (history.state as { category?: string })?.category)
    ),
    missing_fields: hasTitle && !hasDuration ? ['duration'] : [],
  }

  return {
    message: 'Thanks for sharing!',
    state: nextState,
    milestones_preview:
      nextState.title && nextState.duration_days
        ? [
            { title: 'Milestone 1', description: 'Desc 1', relative_day_offset: 7 },
            { title: 'Milestone 2', description: 'Desc 2', relative_day_offset: 14 },
          ]
        : undefined,
  }
})

vi.mock('@/lib/ai/goal-planner', async () => {
  const actual = await vi.importActual('@/lib/ai/goal-planner')
  return {
    ...actual,
    processGoalPlanningMessage: (message: string, history: { state: unknown }) =>
      mockProcessGoalPlanningMessage(message, history),
  }
})

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/utils/slug', () => ({
  generateUniqueSlug: vi.fn(async (title: string) => `${title.toLowerCase().replace(/\s+/g, '-')}-slug`),
}))

const initialPlanningState = {
  conversation_complete: false,
  missing_fields: [] as string[],
}

const greeting =
  "Hi! I'm here to help you plan your goal. What would you like to achieve?"

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
  })
}

describe('Goal Planner API (stateless)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockProcessGoalPlanningMessage.mockClear()

    const { requireMentee, ensureUserAndProfile } = await import('@/lib/clerk')
    vi.mocked(requireMentee).mockResolvedValue(undefined)
    vi.mocked(ensureUserAndProfile).mockResolvedValue({ id: 'profile-1' } as never)

    const { createServiceClient } = await import('@/lib/supabase/service')
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: {
                id: 'goal-1',
                title: 'Learn React',
                status: 'draft',
                profile_id: 'profile-1',
              },
              error: null,
            })),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null })),
          })),
        })),
      })),
    } as never)
  })

  it('start → chat → complete without server session memory', async () => {
    const startResponse = await POST(
      jsonRequest('http://localhost/api/ai/goal-planner?action=start', 'POST', {})
    )
    const startJson = await startResponse.json()
    expect(startResponse.status).toBe(200)

    const sessionId = startJson.data.session_id
    const clientMessages = [{ role: 'assistant' as const, content: greeting }]
    let planningState = startJson.data.state

    const chat1 = await PUT(
      jsonRequest('http://localhost/api/ai/goal-planner?action=chat', 'PUT', {
        session_id: sessionId,
        message: 'I want to learn React',
        state: planningState,
        messages: clientMessages,
      })
    )
    const chat1Json = await chat1.json()
    expect(chat1.status).toBe(200)
    planningState = chat1Json.data.state

    const chat2 = await PUT(
      jsonRequest('http://localhost/api/ai/goal-planner?action=chat', 'PUT', {
        session_id: sessionId,
        message: 'I want to do this in 30 days',
        state: planningState,
        messages: [
          ...clientMessages,
          { role: 'user' as const, content: 'I want to learn React' },
          { role: 'assistant' as const, content: chat1Json.data.message },
        ],
      })
    )
    const chat2Json = await chat2.json()
    expect(chat2.status).toBe(200)
    expect(chat2Json.data.is_complete).toBe(true)

    const complete = await PATCH(
      jsonRequest('http://localhost/api/ai/goal-planner?action=complete', 'PATCH', {
        session_id: sessionId,
        status: 'draft',
        state: chat2Json.data.state,
      })
    )
    const completeJson = await complete.json()
    expect(complete.status).toBe(200)
    expect(completeJson.data.goal.id).toBe('goal-1')
    expect(completeJson.data.should_shape).toBe(true)
  })

  it('chat succeeds with client payload only (no prior start on same instance)', async () => {
    const sessionId = '00000000-0000-0000-0000-000000000001'

    const response = await PUT(
      jsonRequest('http://localhost/api/ai/goal-planner?action=chat', 'PUT', {
        session_id: sessionId,
        message: 'I want to learn React in 30 days for my career',
        state: initialPlanningState,
        messages: [{ role: 'assistant', content: greeting }],
      })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.message).toBeDefined()
    expect(json.data.state.title).toBe('Learn React')
  })

  it('returns 400 when chat payload is missing state', async () => {
    const response = await PUT(
      jsonRequest('http://localhost/api/ai/goal-planner?action=chat', 'PUT', {
        session_id: '00000000-0000-0000-0000-000000000002',
        message: 'Hello',
        messages: [],
      })
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when complete is called with incomplete state', async () => {
    const response = await PATCH(
      jsonRequest('http://localhost/api/ai/goal-planner?action=complete', 'PATCH', {
        session_id: '00000000-0000-0000-0000-000000000003',
        status: 'draft',
        state: initialPlanningState,
      })
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error.code).toBe('INCOMPLETE_CONVERSATION')
  })
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const shouldRunIntegrationTests = supabaseUrl && supabaseServiceKey

describe.skipIf(!shouldRunIntegrationTests)('Goal Planner API (integration)', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testProfileId: string
  let testClerkUserId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    testClerkUserId = `test_clerk_${Date.now()}`
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: testClerkUserId,
        email: `test_${Date.now()}@example.com`,
      })
      .select()
      .single()

    if (userError) throw userError
    testUserId = userData.id

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId,
        display_name: 'Test User',
        headline: 'Test Headline',
        is_mentee: true,
      })
      .select()
      .single()

    if (profileError) throw profileError
    testProfileId = profileData.id
  })

  afterAll(async () => {
    if (testProfileId) {
      await supabase.from('profiles').delete().eq('id', testProfileId)
    }
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  beforeEach(async () => {
    const { requireMentee, ensureUserAndProfile } = await import('@/lib/clerk')
    const profile = await supabase.from('profiles').select('*').eq('id', testProfileId).single()

    vi.mocked(requireMentee).mockResolvedValue(undefined)
    vi.mocked(ensureUserAndProfile).mockResolvedValue(profile.data as never)

    const { createServiceClient } = await import('@/lib/supabase/service')
    vi.mocked(createServiceClient).mockReturnValue(supabase as never)
  })

  it('creates goal in Supabase when conversation state is complete', async () => {
    const startResponse = await POST(
      jsonRequest('http://localhost/api/ai/goal-planner?action=start', 'POST', {})
    )
    const startJson = await startResponse.json()
    const sessionId = startJson.data.session_id
    let planningState = startJson.data.state
    const clientMessages = [{ role: 'assistant' as const, content: startJson.data.message }]

    const chat1 = await PUT(
      jsonRequest('http://localhost/api/ai/goal-planner?action=chat', 'PUT', {
        session_id: sessionId,
        message: 'I want to learn React',
        state: planningState,
        messages: clientMessages,
      })
    )
    const chat1Json = await chat1.json()
    planningState = chat1Json.data.state

    const chat2 = await PUT(
      jsonRequest('http://localhost/api/ai/goal-planner?action=chat', 'PUT', {
        session_id: sessionId,
        message: 'I want to do this in 30 days',
        state: planningState,
        messages: [
          ...clientMessages,
          { role: 'user' as const, content: 'I want to learn React' },
          { role: 'assistant' as const, content: chat1Json.data.message },
        ],
      })
    )
    const chat2Json = await chat2.json()

    const complete = await PATCH(
      jsonRequest('http://localhost/api/ai/goal-planner?action=complete', 'PATCH', {
        session_id: sessionId,
        status: 'draft',
        state: chat2Json.data.state,
      })
    )
    const completeJson = await complete.json()

    expect(complete.status).toBe(200)
    expect(completeJson.data.goal.title).toBeDefined()

    if (completeJson.data.goal.id) {
      await supabase.from('goal_milestones').delete().eq('goal_id', completeJson.data.goal.id)
      await supabase.from('goals').delete().eq('id', completeJson.data.goal.id)
    }
  })
})
