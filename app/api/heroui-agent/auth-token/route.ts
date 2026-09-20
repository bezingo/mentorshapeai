import { auth, currentUser } from '@clerk/nextjs/server'
import { createAuthToken } from '@heroui/agent/server'

export async function POST(request: Request) {
  const { anonymousId, agentId } = (await request.json()) as {
    anonymousId?: string
    agentId?: string
  }

  const apiKey = process.env.HEROUI_AGENT_API_KEY
  const configuredAgentId = process.env.HEROUI_AGENT_ID

  if (
    !apiKey ||
    !configuredAgentId ||
    !anonymousId ||
    !agentId ||
    agentId !== configuredAgentId
  ) {
    return Response.json({ error: 'Invalid agent' }, { status: 400 })
  }

  const { userId } = await auth()
  const user = userId ? await currentUser() : null

  const identity = userId
    ? { id: userId, type: 'user' as const }
    : { id: anonymousId, type: 'anonymous' as const }

  const profile =
    user
      ? {
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
          email: user.emailAddresses[0]?.emailAddress,
          avatarUrl: user.imageUrl,
        }
      : undefined

  const token = await createAuthToken({
    apiKey,
    anonymousId,
    agentId: configuredAgentId,
    identity,
    profile,
    metadata: {
      product: 'mentorshape',
      surface: 'journey',
    },
  })

  return Response.json(token, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
