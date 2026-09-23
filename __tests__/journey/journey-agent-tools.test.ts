import { describe, expect, it } from 'vitest'
import {
  JOURNEY_AGENT_TOOL_NAMES,
  createJourneyAgentTools,
} from '@/lib/agent/journey-agent-tools'
import { MENTORSHAPE_ONBOARDING_SYSTEM_PROMPT, buildOnboardingSystemPrompt } from '@/lib/journey/onboarding-system-prompt'
import { getArtifactRoute } from '@/lib/journey/artifact-hooks'

describe('journey agent tools', () => {
  it('exports all expected tool names', () => {
    const tools = createJourneyAgentTools()
    const names = tools.map((t) => t.name).sort()
    expect(names).toEqual([...JOURNEY_AGENT_TOOL_NAMES].sort())
    expect(names).toHaveLength(10)
  })

  it('maps artifact routes for journey navigation', () => {
    expect(getArtifactRoute('vision-board')).toBe('/journey?artifact=vision-board')
    expect(getArtifactRoute('matching')).toBe('/journey?artifact=matching')
    expect(getArtifactRoute('profile')).toBe('/dashboard/settings/profile')
  })
})

describe('onboarding system prompt', () => {
  it('documents live tools without coming-soon stubs', () => {
    expect(MENTORSHAPE_ONBOARDING_SYSTEM_PROMPT).toContain('getMatchingSuggestions')
    expect(MENTORSHAPE_ONBOARDING_SYSTEM_PROMPT).toContain('openVisionBoard')
    expect(MENTORSHAPE_ONBOARDING_SYSTEM_PROMPT).toContain('draftOutreach')
    expect(MENTORSHAPE_ONBOARDING_SYSTEM_PROMPT).toContain('getUpcomingFocuses')
  })

  it('injects current date context for built-in chat', () => {
    const prompt = buildOnboardingSystemPrompt(new Date('2026-09-23T12:00:00.000Z'))
    expect(prompt).toContain('2026')
    expect(prompt).toContain('Current date context')
  })
})
