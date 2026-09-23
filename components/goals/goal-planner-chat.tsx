'use client'

import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import { RiCheckboxCircleFill, RiErrorWarningFill, RiSparklingLine } from '@remixicon/react'
import { AgentMessage } from '@/components/application/agent-chat/agent-chat-message'
import { AgentComposer } from '@/components/application/agent-chat/agent-composer'
import { AgentThinking } from '@/components/application/agent-thinking/agent-thinking'
import { Button } from '@/components/base/buttons/button'
import { Chip } from '@/components/base/badges/chip'
import { Divider } from '@/components/base/divider/divider'
import { cx } from '@/utils/cx'
import { GoalShapingModal, type GoalShapedData } from './goal-shaping-modal'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface GoalPlanningState {
  title?: string
  category?: string
  duration_days?: 30 | 60
  description?: string
  success_definition?: string
  current_challenges?: string
  motivation?: string
  suggested_approach?: string
  milestones_preview?: Array<{
    title: string
    description: string
    relative_day_offset: number
  }>
  conversation_complete: boolean
  missing_fields: string[]
}

interface ChatResponse {
  message: string
  state: GoalPlanningState
  milestones_preview?: Array<{
    title: string
    description: string
    relative_day_offset: number
  }>
  is_complete: boolean
}

// BoardUI condense-in for panel fields as they get extracted.
const FIELD_HIDDEN = { opacity: 0, y: 4, filter: 'blur(2px)' }
const FIELD_SHOWN = { opacity: 1, y: 0, filter: 'blur(0px)' }
const FIELD_TRANSITION = { duration: 0.22, ease: 'easeOut' } as const

function PanelField({ label, children }: { label: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={reduceMotion ? false : FIELD_HIDDEN}
      animate={FIELD_SHOWN}
      transition={FIELD_TRANSITION}
    >
      <h3 className="mb-1 text-caption-1-medium tracking-wide text-text-tertiary uppercase">{label}</h3>
      <div className="text-body-regular text-text-secondary">{children}</div>
    </motion.div>
  )
}

export function GoalPlannerChat() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [state, setState] = useState<GoalPlanningState>({
    conversation_complete: false,
    missing_fields: [],
  })
  const [isComplete, setIsComplete] = useState(false)
  const [showShapingModal, setShowShapingModal] = useState(false)
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null)
  const [shapedGoalData, setShapedGoalData] = useState<GoalShapedData | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize session on mount
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/goal-planner?action=start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to start session')
      }

      return res.json()
    },
    onSuccess: (data) => {
      setChatError(null)
      setSessionId(data.data.session_id)
      setMessages([
        {
          id: 'initial',
          role: 'assistant',
          content: data.data.message,
          timestamp: new Date(),
        },
      ])
      setState(data.data.state)
    },
    onError: (error: Error) => {
      setChatError(error.message)
    },
  })

  useEffect(() => {
    startSessionMutation.mutate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!sessionId) throw new Error('Session not initialized')

      const res = await fetch('/api/ai/goal-planner?action=chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message,
          state,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to send message')
      }

      return res.json()
    },
    onSuccess: (data: { data: ChatResponse }) => {
      setChatError(null)
      const response = data.data

      // Add assistant response (the user message was added optimistically)
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        },
      ])

      // Update state
      setState(response.state)
      setIsComplete(response.is_complete)
    },
    onError: (error: Error) => {
      setChatError(error.message)
    },
  })

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (status: 'draft' | 'active') => {
      if (!sessionId) throw new Error('Session not initialized')

      const res = await fetch('/api/ai/goal-planner?action=complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          status,
          state,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to create goal')
      }

      return res.json()
    },
    onSuccess: async (data) => {
      setChatError(null)
      const goalId = data.data.goal.id
      setCreatedGoalId(goalId)

      // Trigger Goal Shaper Agent if should_shape is true
      if (data.data.should_shape) {
        try {
          const shapeRes = await fetch('/api/ai/goal-shaper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal_id: goalId }),
          })

          if (shapeRes.ok) {
            const shapedData = await shapeRes.json()
            setShapedGoalData(shapedData.data)
            setShowShapingModal(true)
          } else {
            // If shaping fails, just redirect to goal page
            router.push(`/dashboard/mentee/goals/${goalId}`)
          }
        } catch (error) {
          console.error('Error shaping goal:', error)
          router.push(`/dashboard/mentee/goals/${goalId}`)
        }
      } else {
        router.push(`/dashboard/mentee/goals/${goalId}`)
      }
    },
    onError: (error: Error) => {
      setChatError(error.message)
    },
  })

  const handleSend = () => {
    const message = input.trim()
    if (!message || sendMessageMutation.isPending || !sessionId) return

    // Optimistic user message; the API call is unchanged.
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date(),
      },
    ])
    setInput('')
    setChatError(null)
    sendMessageMutation.mutate(message)
  }

  const handleCreateGoal = (status: 'draft' | 'active') => {
    createGoalMutation.mutate(status)
  }

  if (startSessionMutation.isPending) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-border-button-default bg-background-primary-default py-16 shadow-xs">
        <AgentThinking variant="wave" label="Starting your planning session" />
      </div>
    )
  }

  if (startSessionMutation.isError && !sessionId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border-button-default bg-background-primary-default px-6 py-16 shadow-xs">
        <div className="flex max-w-md gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-body-regular text-destructive">
          <RiErrorWarningFill className="size-5 shrink-0" aria-hidden />
          <span>{chatError || 'Failed to start goal planning. Please refresh and try again.'}</span>
        </div>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => {
            setChatError(null)
            startSessionMutation.mutate()
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="grid h-[calc(100vh-200px)] grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Chat Area */}
      <div className="flex flex-col lg:col-span-2">
        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-xs">
          <div className="border-b border-separator-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-headline-semibold text-text-primary">
              <RiSparklingLine className="size-5 text-button-ghost-foreground" aria-hidden />
              Goal Planner
            </h2>
            <p className="mt-0.5 text-body-regular text-text-secondary">
              Tell me about your goal and I&apos;ll help you plan it step by step
            </p>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden bg-background-secondary-default/40 p-4">
            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto pr-1 pb-4">
              {messages.map((message) => (
                <AgentMessage
                  key={message.id}
                  role={message.role}
                  text={message.content}
                  at={message.timestamp.getTime()}
                />
              ))}
              {sendMessageMutation.isPending && (
                <div className="px-1 py-2">
                  <AgentThinking variant="wave" label="Thinking" showTimer />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {chatError && (
              <div className="mb-3 flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-body-regular text-destructive">
                <RiErrorWarningFill className="size-5 shrink-0" aria-hidden />
                <span>{chatError}</span>
              </div>
            )}

            {/* Composer */}
            <AgentComposer
              value={input}
              onValueChange={setInput}
              onSubmit={handleSend}
              onStop={() => {}}
              busy={sendMessageMutation.isPending}
              provider="Goal Planner"
              messageCount={messages.length}
            />
          </div>
        </div>
      </div>

      {/* Extracted information panel */}
      <div className="lg:col-span-1">
        <div className="h-full overflow-y-auto rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
          <h2 className="text-headline-semibold text-text-primary">Extracted information</h2>

          <div className="mt-4 space-y-4">
            {state.title && (
              <PanelField label="Goal">
                <p className="text-body-medium text-text-primary">{state.title}</p>
              </PanelField>
            )}

            {(state.category || state.duration_days) && (
              <motion.div
                initial={FIELD_HIDDEN}
                animate={FIELD_SHOWN}
                transition={FIELD_TRANSITION}
                className="flex flex-wrap gap-1.5"
              >
                {state.category && <Chip color="purple">{state.category}</Chip>}
                {state.duration_days && <Chip color="soft">{state.duration_days} days</Chip>}
              </motion.div>
            )}

            {state.description && <PanelField label="Description">{state.description}</PanelField>}
            {state.current_challenges && (
              <PanelField label="Challenges">{state.current_challenges}</PanelField>
            )}
            {state.motivation && <PanelField label="Why">{state.motivation}</PanelField>}
            {state.success_definition && (
              <PanelField label="Success looks like">{state.success_definition}</PanelField>
            )}
            {state.suggested_approach && (
              <PanelField label="Suggested approach">{state.suggested_approach}</PanelField>
            )}

            <Divider />

            {/* Milestones Preview */}
            {state.milestones_preview && state.milestones_preview.length > 0 && (
              <div>
                <h3 className="mb-2 text-caption-1-medium tracking-wide text-text-tertiary uppercase">
                  Milestones preview
                </h3>
                <div className="space-y-2">
                  {state.milestones_preview.map((milestone, index) => (
                    <motion.div
                      key={index}
                      initial={FIELD_HIDDEN}
                      animate={FIELD_SHOWN}
                      transition={{ ...FIELD_TRANSITION, delay: index * 0.04 }}
                      className="rounded-xl border border-border-button-default bg-background-secondary-default/60 p-3"
                    >
                      <p className="text-body-medium text-text-primary">{milestone.title}</p>
                      <p className="mt-1 text-caption-1-regular text-text-secondary">
                        {milestone.description}
                      </p>
                      {state.duration_days && (
                        <p className="mt-1 text-caption-1-regular text-text-tertiary">
                          Day {milestone.relative_day_offset} of {state.duration_days}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Completion Status */}
            {isComplete && (
              <motion.div
                initial={FIELD_HIDDEN}
                animate={FIELD_SHOWN}
                transition={FIELD_TRANSITION}
                className="space-y-3 border-t border-separator-border pt-4"
              >
                {chatError && createGoalMutation.isError && (
                  <div className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-body-regular text-destructive">
                    <RiErrorWarningFill className="size-5 shrink-0" aria-hidden />
                    <span>{chatError}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <RiCheckboxCircleFill className="size-4 text-status-lime-text" aria-hidden />
                  <span className="text-body-medium text-text-primary">Ready to create goal</span>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleCreateGoal('active')}
                    disabled={createGoalMutation.isPending}
                    className="w-full"
                  >
                    {createGoalMutation.isPending ? 'Creating…' : 'Create Active Goal'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleCreateGoal('draft')}
                    disabled={createGoalMutation.isPending}
                    className="w-full"
                  >
                    {createGoalMutation.isPending ? 'Creating…' : 'Save as Draft'}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Missing Fields Hint */}
            {!isComplete && state.missing_fields.length > 0 && (
              <div className={cx('border-t border-separator-border pt-4')}>
                <p className="text-caption-1-regular text-text-tertiary">
                  Consider sharing: {state.missing_fields.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Goal Shaping Modal */}
      {showShapingModal && createdGoalId && shapedGoalData && (
        <GoalShapingModal
          open={showShapingModal}
          onOpenChange={setShowShapingModal}
          goalId={createdGoalId}
          initialData={shapedGoalData}
          onSuccess={() => {
            router.push(`/dashboard/mentee/goals/${createdGoalId}`)
          }}
        />
      )}
    </div>
  )
}
