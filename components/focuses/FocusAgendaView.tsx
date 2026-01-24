'use client'

import { useState } from 'react'
import {
  ListChecks,
  MessageCircleQuestion,
  Lightbulb,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export interface AgendaTopic {
  title: string
  description?: string
  duration_minutes?: number
  priority?: 'high' | 'medium' | 'low'
}

export interface AgendaActionItem {
  id: string
  title: string
  status: 'pending' | 'completed'
  due_date?: string
}

export interface FocusAgenda {
  id: string
  focus_id: string
  topics: AgendaTopic[]
  questions: string[]
  previous_action_items?: AgendaActionItem[]
  preparation_tips?: string[]
  mentee_notes?: string
  mentor_notes?: string
  generated_at?: string
}

interface FocusAgendaViewProps {
  agenda: FocusAgenda | null
  userRole: 'mentor' | 'mentee'
  isLoading?: boolean
  onUpdateNotes?: (notes: string) => Promise<void>
}

/**
 * FocusAgendaView - Display focus agenda with topics, questions, prep tips
 */
export function FocusAgendaView({
  agenda,
  userRole,
  isLoading = false,
  onUpdateNotes,
}: FocusAgendaViewProps) {
  const [isTopicsOpen, setIsTopicsOpen] = useState(true)
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(true)
  const [isTipsOpen, setIsTipsOpen] = useState(false)
  const [isActionItemsOpen, setIsActionItemsOpen] = useState(false)
  const [notes, setNotes] = useState(
    userRole === 'mentee' ? agenda?.mentee_notes || '' : agenda?.mentor_notes || ''
  )
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // Handle saving notes
  const handleSaveNotes = async () => {
    if (!onUpdateNotes) return
    setIsSavingNotes(true)
    try {
      await onUpdateNotes(notes)
    } finally {
      setIsSavingNotes(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading agenda...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!agenda) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Agenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              No agenda available yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              An AI-generated agenda will appear here 24 hours before the session
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const priorityColors: Record<string, string> = {
    high: 'bg-red-500/10 text-red-600 border-red-200',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    low: 'bg-green-500/10 text-green-600 border-green-200',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Session Agenda
          </CardTitle>
          {agenda.generated_at && (
            <Badge variant="outline" className="text-xs">
              Generated {new Date(agenda.generated_at).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Topics Section */}
        {agenda.topics && agenda.topics.length > 0 && (
          <Collapsible open={isTopicsOpen} onOpenChange={setIsTopicsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto hover:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <span className="font-medium">Topics to Cover</span>
                  <Badge variant="secondary" className="text-xs">
                    {agenda.topics.length}
                  </Badge>
                </div>
                {isTopicsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <ul className="space-y-3">
                {agenda.topics.map((topic, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{topic.title}</p>
                        {topic.priority && (
                          <Badge
                            variant="outline"
                            className={cn('text-xs', priorityColors[topic.priority])}
                          >
                            {topic.priority}
                          </Badge>
                        )}
                        {topic.duration_minutes && (
                          <span className="text-xs text-muted-foreground">
                            ~{topic.duration_minutes} min
                          </span>
                        )}
                      </div>
                      {topic.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {topic.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Questions Section */}
        {agenda.questions && agenda.questions.length > 0 && (
          <Collapsible open={isQuestionsOpen} onOpenChange={setIsQuestionsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto hover:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <MessageCircleQuestion className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Discussion Questions</span>
                  <Badge variant="secondary" className="text-xs">
                    {agenda.questions.length}
                  </Badge>
                </div>
                {isQuestionsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <ul className="space-y-2">
                {agenda.questions.map((question, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30"
                  >
                    <span className="text-blue-500 mt-0.5">?</span>
                    <span className="text-sm">{question}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Preparation Tips Section */}
        {agenda.preparation_tips && agenda.preparation_tips.length > 0 && (
          <Collapsible open={isTipsOpen} onOpenChange={setIsTipsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto hover:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">Preparation Tips</span>
                  <Badge variant="secondary" className="text-xs">
                    {agenda.preparation_tips.length}
                  </Badge>
                </div>
                {isTipsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <ul className="space-y-2">
                {agenda.preparation_tips.map((tip, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-2 rounded-lg bg-yellow-500/5"
                  >
                    <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Previous Action Items Section */}
        {agenda.previous_action_items && agenda.previous_action_items.length > 0 && (
          <Collapsible open={isActionItemsOpen} onOpenChange={setIsActionItemsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto hover:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Previous Action Items</span>
                  <Badge variant="secondary" className="text-xs">
                    {agenda.previous_action_items.length}
                  </Badge>
                </div>
                {isActionItemsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <ul className="space-y-2">
                {agenda.previous_action_items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30"
                  >
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border-2 shrink-0',
                        item.status === 'completed'
                          ? 'bg-green-500 border-green-500'
                          : 'border-muted-foreground'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm',
                        item.status === 'completed' && 'line-through text-muted-foreground'
                      )}
                    >
                      {item.title}
                    </span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Notes Section */}
        {onUpdateNotes && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Your Notes {userRole === 'mentee' ? '(Mentee)' : '(Mentor)'}
              </label>
              {notes !== (userRole === 'mentee' ? agenda.mentee_notes : agenda.mentor_notes) && (
                <Badge variant="outline" className="text-xs">
                  Unsaved changes
                </Badge>
              )}
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes for this session..."
              className="min-h-[100px] resize-none"
            />
            <Button
              size="sm"
              onClick={handleSaveNotes}
              disabled={
                isSavingNotes ||
                notes === (userRole === 'mentee' ? agenda.mentee_notes : agenda.mentor_notes)
              }
            >
              {isSavingNotes ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Notes'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
