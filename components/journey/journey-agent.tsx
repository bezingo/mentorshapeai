'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GetAuthToken } from '@heroui/agent'
import { HeroUIAgent, useAgent } from '@heroui/agent/next'
import { createJourneyAgentTools } from '@/lib/agent/journey-agent-tools'

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
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-medium">HeroUI Agent is not configured</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Set <code className="text-xs">HEROUI_AGENT_API_KEY</code>,{' '}
          <code className="text-xs">HEROUI_AGENT_ID</code>, and{' '}
          <code className="text-xs">NEXT_PUBLIC_HEROUI_AGENT_ID</code> in your environment, then
          create the agent via the{' '}
          <a
            className="underline"
            href="https://heroui.pro/agents"
            target="_blank"
            rel="noreferrer"
          >
            Agents dashboard
          </a>
          .
        </p>
      </div>
    )
  }

  return (
    <>
      <HeroUIAgent
        agentId={agentId}
        getAuthToken={getAuthToken}
        tools={tools}
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
