'use client'

import { useState, useRef, useEffect } from 'react'
import { useGoalAdvisor } from '@/hooks/use-goal-advisor'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from '@/components/ui/prompt-input'
import { Separator } from '@/components/ui/separator'
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Link as LinkIcon, 
  Loader2,
  Sparkles,
  X,
  FileText,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
    removeAttachment
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
    console.log('🎯 handleSendMessage called', { localInput, isLoading })
    
    if (!localInput.trim() || isLoading) {
      console.log('❌ Message blocked:', { hasContent: !!localInput.trim(), isLoading })
      return
    }
    
    const messageContent = localInput
    console.log('📤 Sending message:', messageContent)
    setLocalInput('') // Clear immediately for better UX
    
    // sendMessage expects CreateUIMessage format with role and content
    sendMessage({
      role: 'user',
      content: messageContent
    })
    console.log('✅ sendMessage called')
  }
  
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 z-50 shadow-lg gap-2 rounded-full h-14 px-6"
          >
            <MessageSquare className="h-5 w-5" />
            <span>AI Advisor</span>
          </Button>
        </SheetTrigger>
        
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-2xl p-0 flex flex-col"
        >
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Goal Advisor
            </SheetTitle>
            <SheetDescription>
              Get AI-powered guidance for: {goalTitle}
            </SheetDescription>
          </SheetHeader>
          
          <Separator />
          
          {/* Attachments Bar */}
          {attachments.length > 0 && (
            <>
              <div className="px-6 py-3 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Attached Resources ({attachments.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 text-xs bg-background border rounded-lg px-3 py-1.5"
                    >
                      {attachment.type === 'file' ? (
                        <FileText className="h-3 w-3" />
                      ) : (
                        <LinkIcon className="h-3 w-3" />
                      )}
                      <span className="truncate max-w-[150px]">
                        {attachment.name}
                      </span>
                      {attachment.url && (
                        <a 
                          href={attachment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <button
                        onClick={() => removeAttachment(attachment.id)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-12">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation with your AI Goal Advisor</p>
                <p className="text-xs mt-2">
                  Ask questions, request analysis, or get guidance on your goal
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-3',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Show tool calls if any */}
                  {message.toolInvocations && message.toolInvocations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.toolInvocations.map((tool: any, idx: number) => (
                        <div key={idx} className="text-xs opacity-70 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>
                            {tool.state === 'result' ? '✓' : '...'} {tool.toolName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            
            {error && (
              <div className="text-center text-sm text-destructive py-2">
                Error: {error.message}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <Separator />
          
          {/* Link Input */}
          {showLinkInput && (
            <>
              <div className="px-6 py-3 bg-muted/50">
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste URL to add to conversation..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddLink()
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border rounded-md"
                    disabled={isParsingLink}
                  />
                  <Button
                    onClick={handleAddLink}
                    disabled={!linkUrl.trim() || isParsingLink}
                    size="sm"
                  >
                    {isParsingLink ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowLinkInput(false)
                      setLinkUrl('')
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <Separator />
            </>
          )}
          
          {/* Input Area */}
          <div className="p-6 pt-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.txt,.md,image/*"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFile || !conversationId}
                  title="Attach file"
                >
                  {isUploadingFile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  disabled={!conversationId}
                  title="Add link"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
              
              <PromptInput
                value={localInput}
                onValueChange={setLocalInput}
                onSubmit={handleSendMessage}
                isLoading={isLoading}
                disabled={isLoading}
                className="min-h-[60px]"
              >
                <PromptInputTextarea
                  placeholder="Ask a question or request guidance..."
                  className="min-h-[44px]"
                />
                <PromptInputActions>
                  <PromptInputAction tooltip="Send message">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={!localInput.trim() || isLoading}
                      onClick={handleSendMessage}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>
              
              <p className="text-xs text-muted-foreground">
                Tip: Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
