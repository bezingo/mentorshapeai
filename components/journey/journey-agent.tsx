'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GetAuthToken } from '@heroui/agent'
import { HeroUIAgent, useAgent } from '@heroui/agent/next'
import { createJourneyAgentTools } from '@/lib/agent/journey-agent-tools'
import { JourneyChat } from '@/components/journey/journey-chat'

const agentId = process.env.NEXT_PUBLIC_HEROUI_AGENT_ID

const getAuthToken: GetAuthToken = async (context) => {
  const response = await fetch('/api/heroui-agent/auth-token', {
    method: 'POST',
    signal: context.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  })

  if (!response.ok) {
    throw new Error('Agent authentication failed')
  }

  return response.json()
}

function AgentAutoOpen() {
  const agent = useAgent(agentId ?? undefined)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_HEROUI_AGENT_ID) return
    agent.show()
  }, [agent])

  return null
}

export function JourneyAgent() {
  const router = useRouter()
  const [recentGoalTitle, setRecentGoalTitle] = useState<string | null>(null)

  const onGoalSaved = useCallback((goal: { id: string; title: string }) => {
    setRecentGoalTitle(goal.title)
  }, [])

  const tools = useMemo(
    () => createJourneyAgentTools(),
    []
  )

  if (!agentId) {
    return <JourneyChat onGoalSaved={onGoalSaved} />
  }

  return (
    <>
      <HeroUIAgent
        agentId={agentId}
        getAuthToken={getAuthToken}
        tools={tools}
        onError={(err) => {
          console.error('[Journey Agent]', err)
        }}
        context={{
          router,
          onGoalSaved,
          page: () => ({
            route: '/journey',
            recentGoalTitle,
          }),
        }}
        showLauncher={false}
        remoteConfig={true}
        appearance={{
          viewMode: 'sidebar',
          shouldCloseOnInteractOutside: false,
          panel: {
            initialWidth: 'min(100%, 720px)',
          },
        }}
        composer={{
          placeholder: 'Tell me what you want to achieve this year…',
        }}
        startScreen={{
          greeting: 'Welcome to Mentorshape',
          subtitle: 'I will help you set goals, build your profile, and find mentors.',
          prompts: [
            'I want a mentor for my career',
            'Help me set a goal for this year',
            'I am open to mentoring others',
          ],
        }}
      />
      <AgentAutoOpen />
    </>
  )
}
