import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/journey/chat/route'

vi.mock('@/lib/clerk', () => ({
  requireAuth: vi.fn(),
  ensureUserAndProfile: vi.fn(),
}))

vi.mock('@/lib/journey/journey-conversation', () => ({
  getOrCreateJourneyConversation: vi.fn(),
  getLatestJourneyConversationForProfile: vi.fn(),
  loadJourneyConversationHistory: vi.fn(),
  assertJourneyConversationOwnedByProfile: vi.fn(),
  saveJourneyMessage: vi.fn(),
}))

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>()
  return {
    ...actual,
    streamText: vi.fn(() => ({
      toUIMessageStreamResponse: () =>
        new Response('stream', {
          headers: { 'Content-Type': 'text/event-stream' },
        }),
    })),
    convertToModelMessages: vi.fn(async (messages: unknown[]) => messages),
  }
})

import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import {
  getLatestJourneyConversationForProfile,
  loadJourneyConversationHistory,
} from '@/lib/journey/journey-conversation'

describe('/api/journey/chat auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('GET returns conversation payload for signed-in user', async () => {
    vi.mocked(requireAuth).mockResolvedValue('clerk-user')
    vi.mocked(ensureUserAndProfile).mockResolvedValue({ id: 'profile-1' } as never)
    vi.mocked(getLatestJourneyConversationForProfile).mockResolvedValue('conv-1')
    vi.mocked(loadJourneyConversationHistory).mockResolvedValue([])

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.conversationId).toBe('conv-1')
  })

  it('POST returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))

    const res = await POST(
      new Request('http://localhost/api/journey/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when messages missing', async () => {
    vi.mocked(requireAuth).mockResolvedValue('clerk-user')
    vi.mocked(ensureUserAndProfile).mockResolvedValue({ id: 'profile-1' } as never)

    const res = await POST(
      new Request('http://localhost/api/journey/chat', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )
    expect(res.status).toBe(400)
  })
})
