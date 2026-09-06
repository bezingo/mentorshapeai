'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { RiArrowLeftLine, RiSparklingLine } from '@remixicon/react'
import { AgentMessage } from '@/components/application/agent-chat/agent-chat-message'
import { AgentComposer } from '@/components/application/agent-chat/agent-composer'
import { AgentThinking } from '@/components/application/agent-thinking/agent-thinking'
import { ThemeToggle } from '@/components/application/theme/theme-toggle'

/**
 * Demo of the BoardUI AI chat shell (message stream, thinking indicator,
 * composer with loader) with locally scripted answers — no provider key or
 * account needed. The real product chats (Goal Planner, Goal Advisor) use the
 * same shell wired to Mentorshape's own AI endpoints.
 */

interface DemoMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: number
  streaming?: boolean
}

const DEMO_ANSWERS = [
  'This page is a live demo of the BoardUI AI chat shell now used across Mentorshape.\nThe Goal Planner and Goal Advisor use this exact chat surface, wired to real AI endpoints.',
  'Replies stream in a paragraph at a time, each softening in from a blur — the BoardUI motion recipe.\nWhile a reply is being produced, the composer runs the orbiting loader and shows a stop control.',
  'Everything here uses semantic tokens, so it follows light and dark mode automatically.\nTry the theme toggle in the top right.',
]

export function AiChatDemo() {
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const answerIndexRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setBusy(false)
    setMessages((prev) => prev.map((m) => ({ ...m, streaming: false })))
  }

  const send = () => {
    const content = input.trim()
    if (!content || busy) return

    setInput('')
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content, at: Date.now() },
    ])
    setBusy(true)

    const answer = DEMO_ANSWERS[answerIndexRef.current % DEMO_ANSWERS.length]
    answerIndexRef.current += 1
    const words = answer.split(' ')
    const assistantId = `assistant-${Date.now()}`

    // A short "thinking" beat, then words released on a steady tick.
    setTimeout(() => {
      let shown = 0
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', at: Date.now(), streaming: true },
      ])
      timerRef.current = setInterval(() => {
        shown += 1
        const done = shown >= words.length
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: words.slice(0, shown).join(' '), streaming: !done }
              : m
          )
        )
        if (done) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          setBusy(false)
        }
      }, 60)
    }, 900)
  }

  const lastMessage = messages[messages.length - 1]
  const isAwaitingReply = busy && lastMessage?.role === 'user'

  return (
    <div className="flex min-h-screen flex-col bg-background-full">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-separator-border bg-background-full/80 px-6 backdrop-blur-md">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-body-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
        >
          <RiArrowLeftLine className="size-4" aria-hidden />
          Back to dashboard
        </Link>
        <span className="flex items-center gap-2 text-headline-semibold text-text-primary">
          <RiSparklingLine className="size-5 text-button-ghost-foreground" aria-hidden />
          BoardUI AI Chat
        </span>
        <ThemeToggle appearance="segmented" />
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        <div className="flex-1 space-y-4 overflow-y-auto pb-6">
          {messages.length === 0 && (
            <div className="py-16 text-center">
              <RiSparklingLine
                className="mx-auto mb-4 size-12 text-foreground-icon-tertiary"
                aria-hidden
              />
              <p className="text-body-regular text-text-secondary">
                Say anything to see the BoardUI chat shell in motion.
              </p>
              <p className="mt-2 text-caption-1-regular text-text-tertiary">
                Scripted demo — no AI key required.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <AgentMessage
              key={message.id}
              role={message.role}
              text={message.content}
              streaming={message.streaming}
              at={message.at}
            />
          ))}

          {isAwaitingReply && (
            <div className="px-1 py-2">
              <AgentThinking variant="stars" label="Thinking" showTimer />
            </div>
          )}

          <div ref={endRef} />
        </div>

        <AgentComposer
          value={input}
          onValueChange={setInput}
          onSubmit={send}
          onStop={stop}
          busy={busy}
          provider="Scripted demo"
          messageCount={messages.length}
        />
      </main>
    </div>
  )
}
