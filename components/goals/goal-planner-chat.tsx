'use client'

import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Loader2, Send, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { GoalShapingModal } from './goal-shaping-modal'

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
  const [shapedGoalData, setShapedGoalData] = useState<any>(null)
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
          message: message,
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
      
      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: input,
          timestamp: new Date(),
        },
      ])

      // Add assistant response
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
      setInput('')
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
          status: status,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to create goal')
      }

      return res.json()
    },
    onSuccess: async (data) => {
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
      alert(`Error creating goal: ${error.message}`)
    },
  })

  const handleSend = () => {
    if (!input.trim() || sendMessageMutation.isPending) return
    sendMessageMutation.mutate(input)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCreateGoal = (status: 'draft' | 'active') => {
    createGoalMutation.mutate(status)
  }

  if (startSessionMutation.isPending) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Chat Area */}
      <div className="lg:col-span-2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Goal Planner
            </CardTitle>
            <CardDescription>
              Tell me about your goal and I'll help you plan it step by step
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {sendMessageMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {chatError && (
              <div className="mb-3 flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{chatError}</span>
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                rows={2}
                disabled={sendMessageMutation.isPending || !sessionId}
                className="resize-none"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sendMessageMutation.isPending || !sessionId}
                size="icon"
                className="shrink-0"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1">
        <Card className="h-full overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-lg">Extracted Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Goal Title */}
            {state.title && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Goal</h3>
                <p className="text-sm font-medium">{state.title}</p>
              </div>
            )}

            {/* Category */}
            {state.category && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Category</h3>
                <p className="text-sm">{state.category}</p>
              </div>
            )}

            {/* Duration */}
            {state.duration_days && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Duration</h3>
                <p className="text-sm">{state.duration_days} days</p>
              </div>
            )}

            {/* Description */}
            {state.description && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="text-sm text-muted-foreground">{state.description}</p>
              </div>
            )}

            {/* Challenges */}
            {state.current_challenges && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Challenges</h3>
                <p className="text-sm text-muted-foreground">{state.current_challenges}</p>
              </div>
            )}

            {/* Motivation */}
            {state.motivation && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Why</h3>
                <p className="text-sm text-muted-foreground">{state.motivation}</p>
              </div>
            )}

            {/* Success Definition */}
            {state.success_definition && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Success Looks Like
                </h3>
                <p className="text-sm text-muted-foreground">{state.success_definition}</p>
              </div>
            )}

            {/* Suggested Approach */}
            {state.suggested_approach && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Suggested Approach
                </h3>
                <p className="text-sm text-muted-foreground">{state.suggested_approach}</p>
              </div>
            )}

            <Separator />

            {/* Milestones Preview */}
            {state.milestones_preview && state.milestones_preview.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Milestones Preview
                </h3>
                <div className="space-y-2">
                  {state.milestones_preview.map((milestone, index) => (
                    <div key={index} className="p-2 rounded border text-sm">
                      <p className="font-medium">{milestone.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {milestone.description}
                      </p>
                      {state.duration_days && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Day {milestone.relative_day_offset} of {state.duration_days}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completion Status */}
            {isComplete && (
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Ready to create goal</span>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleCreateGoal('active')}
                    disabled={createGoalMutation.isPending}
                    className="w-full"
                  >
                    {createGoalMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Active Goal'
                    )}
                  </Button>
                  <Button
                    onClick={() => handleCreateGoal('draft')}
                    disabled={createGoalMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {createGoalMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Save as Draft'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Missing Fields Hint */}
            {!isComplete && state.missing_fields.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Consider sharing: {state.missing_fields.join(', ')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
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

