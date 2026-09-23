'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isToolUIPart, type UIMessage } from 'ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Button,
  Chip,
  Spinner,
  TextArea,
} from '@heroui/react'
import { AlertCircle, Send, Sparkles } from 'lucide-react'
import {
  applyJourneyClientAction,
  dispatchArtifactRefresh,
  isJourneyClientAction,
  toolOutputNeedsArtifactRefresh,
} from '@/lib/journey/journey-client-actions'

const START_PROMPTS = [
  'I want a mentor for my career',
  'Help me set a goal for this year',
  'I am open to mentoring others',
] as const

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
}

function toolPartLabel(part: { type: string; state?: string; toolName?: string }): string {
  const name = part.type.startsWith('tool-')
    ? part.type.replace(/^tool-/, '')
    : part.toolName ?? 'tool'
  if (part.state === 'output-available' || part.state === 'output-error') {
    return `${name} ✓`
  }
  return `${name}…`
}

export type JourneyChatProps = {
  onGoalSaved?: (goal: { id: string; title: string }) => void
}

export function JourneyChat({ onGoalSaved }: JourneyChatProps) {
  const router = useRouter()
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [initializing, setInitializing] = useState(true)
  const handledToolOutputs = useRef(new Set<string>())

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/journey/chat',
        body: () => ({
          conversationId,
        }),
      }),
    [conversationId]
  )

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
    onError: (err) => {
      console.error('[JourneyChat]', err)
    },
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/journey/chat')
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error?.message ?? 'Failed to load chat')
        }
        const json = await res.json()
        if (cancelled) return
        setConversationId(json.data.conversationId)
        const prior = (json.data.messages ?? []) as {
          id: string
          role: string
          content: string
        }[]
        if (prior.length > 0) {
          setMessages(
            prior.map((m) => ({
              id: m.id,
              role: m.role as UIMessage['role'],
              parts: [{ type: 'text' as const, text: m.content }],
            }))
          )
        }
      } catch (err) {
        if (!cancelled) {
          setBootstrapError(err instanceof Error ? err.message : 'Failed to start chat')
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [setMessages])

  const processToolOutputs = useCallback(
    (allMessages: UIMessage[]) => {
      for (const message of allMessages) {
        if (message.role !== 'assistant') continue
        for (const part of message.parts) {
          if (!isToolUIPart(part)) continue
          if (part.state !== 'output-available') continue
          const key = `${message.id}:${part.toolCallId}`
          if (handledToolOutputs.current.has(key)) continue
          handledToolOutputs.current.add(key)

          const output = part.output as Record<string, unknown> | undefined
          if (output?.clientAction && isJourneyClientAction(output.clientAction)) {
            applyJourneyClientAction(output.clientAction, router)
          }
          if (toolOutputNeedsArtifactRefresh(output)) {
            dispatchArtifactRefresh()
          }
          if (output?.success && typeof output.root_goal_id === 'string') {
            onGoalSaved?.({
              id: output.root_goal_id,
              title: typeof output.title === 'string' ? output.title : 'Year goal',
            })
          }
          if (output?.success && typeof output.goalId === 'string') {
            onGoalSaved?.({
              id: output.goalId,
              title: typeof output.title === 'string' ? output.title : 'Goal',
            })
          }
        }
      }
    },
    [onGoalSaved, router]
  )

  useEffect(() => {
    processToolOutputs(messages)
  }, [messages, processToolOutputs])

  const showStartScreen = messages.length === 0 && status === 'ready'

  const handleSend = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || status !== 'ready') return
    setInput('')
    await sendMessage({ text: trimmed })
  }

  const chatError = bootstrapError ?? error?.message ?? null
  const isBusy = status === 'submitted' || status === 'streaming'

  if (initializing) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {showStartScreen ? (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-6 pt-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Welcome to Mentorshape</h1>
              <p className="text-default-500">
                I will help you set goals, build your profile, and find mentors.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              {START_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  variant="secondary"
                  className="h-auto whitespace-normal py-3 text-left"
                  onPress={() => handleSend(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {messages.map((message) => {
              const text = getMessageText(message)
              const toolParts = message.parts.filter((p) => isToolUIPart(p))
              return (
                <div
                  key={message.id}
                  className={`flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {text ? (
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-small ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-default-100 text-foreground'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{text}</p>
                      )}
                    </div>
                  ) : null}
                  {toolParts.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {toolParts.map((part) => (
                        <Chip
                          key={part.toolCallId}
                          size="sm"
                          variant="soft"
                          color={
                            part.state === 'output-error'
                              ? 'danger'
                              : part.state === 'output-available'
                                ? 'accent'
                                : 'default'
                          }
                        >
                          {toolPartLabel(part)}
                        </Chip>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {isBusy && (
              <div className="flex items-center gap-2 text-default-500">
                <Spinner size="sm" />
                <span className="text-small">Thinking…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {chatError && (
        <div className="mx-4 mb-2 flex gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-small text-danger md:mx-8">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{chatError}</span>
        </div>
      )}

      <div className="shrink-0 border-t bg-background px-4 py-3 md:px-8">
        <form
          className="mx-auto flex max-w-2xl gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSend(input)
          }}
        >
          <TextArea
            aria-label="Message"
            placeholder="Tell me what you want to achieve this year…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 min-h-[44px]"
            disabled={isBusy || Boolean(bootstrapError)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend(input)
              }
            }}
          />
          <Button
            type="submit"
            isIconOnly
            variant="primary"
            isDisabled={!input.trim() || isBusy || Boolean(bootstrapError)}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
