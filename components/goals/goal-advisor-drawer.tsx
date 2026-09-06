'use client'

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { useGoalAdvisor } from '@/hooks/use-goal-advisor'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  RiArrowUpLine,
  RiAttachment2,
  RiChat3Line,
  RiCloseLine,
  RiExternalLinkLine,
  RiFileTextLine,
  RiLink,
  RiLoader4Line,
  RiSparklingLine,
  RiStopFill,
} from '@remixicon/react'
import { AgentMessage } from '@/components/application/agent-chat/agent-chat-message'
import { AgentThinking } from '@/components/application/agent-thinking/agent-thinking'
import { ComposerLoader } from '@/components/application/composer-loader/composer-loader'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { cx } from '@/utils/cx'

interface GoalAdvisorDrawerProps {
  goalId: string
  goalTitle: string
}

export function GoalAdvisorDrawer({ goalId, goalTitle }: GoalAdvisorDrawerProps) {
  const [open, setOpen] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [localInput, setLocalInput] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    sendMessage,
    isLoading,
    error,
    stop,
    conversationId,
    attachments,
    isUploadingFile,
    isParsingLink,
    uploadFile,
    addLink,
    removeAttachment,
  } = useGoalAdvisor(goalId)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await uploadFile(file)
    } catch (error) {
      console.error('File upload failed:', error)
      alert('Failed to upload file. Please try again.')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return

    try {
      await addLink(linkUrl)
      setLinkUrl('')
      setShowLinkInput(false)
    } catch (error) {
      console.error('Link parsing failed:', error)
      alert('Failed to parse link. Please check the URL and try again.')
    }
  }

  const handleSendMessage = () => {
    if (!localInput.trim() || isLoading) return

    const messageContent = localInput
    setLocalInput('') // Clear immediately for better UX

    sendMessage({
      role: 'user',
      content: messageContent,
    })
  }

  const onComposerSubmit = (event: FormEvent) => {
    event.preventDefault()
    handleSendMessage()
  }

  const onComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  // The very last assistant message is the one being streamed into.
  const lastMessage = messages[messages.length - 1]
  const isStreamingReply = isLoading && lastMessage?.role === 'assistant' && lastMessage.content !== ''
  const isAwaitingReply = isLoading && !isStreamingReply

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cx(
              'fixed right-6 bottom-6 z-50 flex h-14 cursor-pointer items-center gap-2 rounded-full bg-button-primary px-6',
              'text-body-medium text-white shadow-lg transition-[filter] duration-150 hover:brightness-[1.06] active:brightness-95'
            )}
          >
            <RiChat3Line className="size-5" aria-hidden />
            <span>AI Advisor</span>
          </button>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-border-button-default bg-background-primary-default p-0 sm:max-w-2xl"
        >
          <SheetHeader className="border-b border-separator-border p-6 pb-4">
            <SheetTitle className="flex items-center gap-2 text-headline-semibold text-text-primary">
              <RiSparklingLine className="size-5 text-button-ghost-foreground" aria-hidden />
              Goal Advisor
            </SheetTitle>
            <SheetDescription className="text-body-regular text-text-secondary">
              Get AI-powered guidance for: {goalTitle}
            </SheetDescription>
          </SheetHeader>

          {/* Attachments Bar */}
          {attachments.length > 0 && (
            <div className="border-b border-separator-border bg-background-secondary-default/60 px-6 py-3">
              <p className="mb-2 text-caption-1-medium tracking-wide text-text-tertiary uppercase">
                Attached resources ({attachments.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 rounded-lg border border-border-button-default bg-background-primary-default px-3 py-1.5 text-caption-1-medium text-text-secondary shadow-xs"
                  >
                    {attachment.type === 'file' ? (
                      <RiFileTextLine className="size-3.5 text-foreground-icon-secondary" aria-hidden />
                    ) : (
                      <RiLink className="size-3.5 text-foreground-icon-secondary" aria-hidden />
                    )}
                    <span className="max-w-[150px] truncate">{attachment.name}</span>
                    {attachment.url && (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground-icon-tertiary transition-colors duration-150 hover:text-foreground-icon-primary"
                      >
                        <RiExternalLinkLine className="size-3.5" aria-hidden />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.name}`}
                      className="cursor-pointer text-foreground-icon-tertiary transition-colors duration-150 hover:text-status-rose-text"
                    >
                      <RiCloseLine className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-background-secondary-default/40 p-6">
            {messages.length === 0 && (
              <div className="py-12 text-center">
                <RiSparklingLine
                  className="mx-auto mb-4 size-12 text-foreground-icon-tertiary"
                  aria-hidden
                />
                <p className="text-body-regular text-text-secondary">
                  Start a conversation with your AI Goal Advisor
                </p>
                <p className="mt-2 text-caption-1-regular text-text-tertiary">
                  Ask questions, request analysis, or get guidance on your goal
                </p>
              </div>
            )}

            {messages.map((message) => (
              <AgentMessage
                key={message.id}
                role={message.role}
                text={message.content}
                streaming={isLoading && message.id === lastMessage?.id && message.role === 'assistant'}
              />
            ))}

            {isAwaitingReply && (
              <div className="px-1 py-2">
                <AgentThinking variant="wave" label="Thinking" showTimer />
              </div>
            )}

            {error && (
              <p className="py-2 text-center text-body-regular text-status-rose-text">
                Error: {error.message}
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Link Input */}
          {showLinkInput && (
            <div className="border-t border-separator-border bg-background-secondary-default/60 px-6 py-3">
              <div className="flex items-center gap-2">
                <Input
                  type="url"
                  aria-label="Link URL"
                  placeholder="Paste URL to add to conversation…"
                  value={linkUrl}
                  onChange={setLinkUrl}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddLink()
                    }
                  }}
                  isDisabled={isParsingLink}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleAddLink}
                  disabled={!linkUrl.trim() || isParsingLink}
                >
                  {isParsingLink ? 'Adding…' : 'Add'}
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => {
                    setShowLinkInput(false)
                    setLinkUrl('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Composer — the BoardUI composer pill with working attach/link slots. */}
          <div className="border-t border-separator-border p-6 pt-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.txt,.md,image/*"
            />

            <ComposerLoader active={isLoading}>
              <form
                onSubmit={onComposerSubmit}
                className={cx(
                  'flex h-[52px] w-full items-center gap-2.5 rounded-full p-2',
                  isLoading ? 'bg-transparent' : 'bg-background-primary-default shadow-xs'
                )}
              >
                <button
                  type="button"
                  aria-label="Attach file"
                  title="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFile || !conversationId}
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ai-chat-composer-add-background text-foreground-icon-primary transition-colors duration-150 ease hover:bg-ai-chat-composer-add-hover-background disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isUploadingFile ? (
                    <RiLoader4Line className="size-5 animate-spin" aria-hidden />
                  ) : (
                    <RiAttachment2 className="size-5" aria-hidden />
                  )}
                </button>

                <button
                  type="button"
                  aria-label="Add link"
                  title="Add link"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  disabled={!conversationId}
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ai-chat-composer-add-background text-foreground-icon-primary transition-colors duration-150 ease hover:bg-ai-chat-composer-add-hover-background disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RiLink className="size-5" aria-hidden />
                </button>

                <label className="sr-only" htmlFor="goal-advisor-composer-input">
                  Message
                </label>
                <input
                  id="goal-advisor-composer-input"
                  type="text"
                  value={localInput}
                  onChange={(event) => setLocalInput(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Ask a question or request guidance…"
                  autoComplete="off"
                  className="h-5 min-w-0 flex-1 bg-transparent text-body-regular text-text-primary caret-text-primary outline-none placeholder:text-text-tertiary"
                />

                <div className="flex shrink-0 items-center gap-2 pl-1.5">
                  {isLoading ? (
                    <button
                      type="button"
                      onClick={stop}
                      aria-label="Stop generating"
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-background-secondary-default text-foreground-icon-secondary transition-colors hover:bg-background-secondary-hover"
                    >
                      <RiStopFill className="size-5" aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      aria-label="Send message"
                      disabled={localInput.trim().length === 0}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-button-primary text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RiArrowUpLine className="size-5" aria-hidden />
                    </button>
                  )}
                </div>
              </form>
            </ComposerLoader>

            <p className="mt-2 text-caption-1-regular text-text-tertiary">
              Tip: press Enter to send. Attach files or links to give the advisor more context.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
