'use client'

import { useState } from 'react'
import {
  FileText,
  CheckCircle2,
  Lightbulb,
  ListChecks,
  TrendingUp,
  Smile,
  Meh,
  Frown,
  Loader2,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SummaryActionItem {
  title: string
  assignee: 'mentor' | 'mentee'
  due_date?: string
  priority?: 'high' | 'medium' | 'low'
}

export interface MilestoneUpdate {
  milestone_id: string
  title: string
  progress_percent?: number
  notes?: string
}

export interface FocusSummary {
  id: string
  focus_id: string
  summary: string
  key_decisions?: string[]
  mentee_action_items?: SummaryActionItem[]
  mentor_action_items?: SummaryActionItem[]
  milestone_updates?: MilestoneUpdate[]
  mood_rating?: number
  generated_at?: string
}

interface FocusSummaryViewProps {
  summary: FocusSummary | null
  userRole: 'mentor' | 'mentee'
  isLoading?: boolean
  onRateMood?: (rating: number) => Promise<void>
}

/**
 * Get mood icon based on rating
 */
function getMoodIcon(rating: number) {
  if (rating >= 4) return <Smile className="h-5 w-5 text-green-500" />
  if (rating >= 3) return <Meh className="h-5 w-5 text-yellow-500" />
  return <Frown className="h-5 w-5 text-red-500" />
}

/**
 * FocusSummaryView - Display focus summary with action items and decisions
 */
export function FocusSummaryView({
  summary,
  userRole,
  isLoading = false,
  onRateMood,
}: FocusSummaryViewProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(
    summary?.mood_rating || null
  )
  const [isSavingMood, setIsSavingMood] = useState(false)

  // Handle mood rating
  const handleRateMood = async (rating: number) => {
    if (!onRateMood) return
    setSelectedMood(rating)
    setIsSavingMood(true)
    try {
      await onRateMood(rating)
    } finally {
      setIsSavingMood(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading summary...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Session Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              No summary available yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              A summary will be generated after the session is completed
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const allActionItems = [
    ...(summary.mentee_action_items || []),
    ...(summary.mentor_action_items || []),
  ]

  return (
    <div className="space-y-6">
      {/* Main Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Session Summary
            </CardTitle>
            {summary.generated_at && (
              <Badge variant="outline" className="text-xs">
                Generated {new Date(summary.generated_at).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Text */}
          <div className="prose prose-sm max-w-none">
            <p className="text-sm leading-relaxed">{summary.summary}</p>
          </div>

          {/* Mood Rating Section (only for mentee) */}
          {userRole === 'mentee' && onRateMood && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  How did this session feel?
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={selectedMood === rating ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-10 w-10 p-0',
                      selectedMood === rating && 'ring-2 ring-primary ring-offset-2'
                    )}
                    onClick={() => handleRateMood(rating)}
                    disabled={isSavingMood}
                  >
                    {rating <= 2 ? (
                      <Frown className={cn('h-5 w-5', selectedMood === rating ? 'text-white' : 'text-red-500')} />
                    ) : rating === 3 ? (
                      <Meh className={cn('h-5 w-5', selectedMood === rating ? 'text-white' : 'text-yellow-500')} />
                    ) : (
                      <Smile className={cn('h-5 w-5', selectedMood === rating ? 'text-white' : 'text-green-500')} />
                    )}
                  </Button>
                ))}
                {isSavingMood && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          )}

          {/* Existing Mood Rating Display */}
          {summary.mood_rating && !onRateMood && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              {getMoodIcon(summary.mood_rating)}
              <span className="text-sm">
                Session rated {summary.mood_rating}/5
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Decisions Card */}
      {summary.key_decisions && summary.key_decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Key Decisions
              <Badge variant="secondary" className="text-xs">
                {summary.key_decisions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.key_decisions.map((decision, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5"
                >
                  <CheckCircle2 className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{decision}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Items Card */}
      {allActionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-5 w-5 text-blue-500" />
              Action Items
              <Badge variant="secondary" className="text-xs">
                {allActionItems.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mentee Action Items */}
            {summary.mentee_action_items && summary.mentee_action_items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  For Mentee
                </h4>
                <ul className="space-y-2">
                  {summary.mentee_action_items.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5"
                    >
                      <div className="h-4 w-4 rounded-full border-2 border-blue-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {new Date(item.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {item.priority && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs shrink-0',
                            item.priority === 'high' && 'border-red-200 text-red-600',
                            item.priority === 'medium' && 'border-yellow-200 text-yellow-600',
                            item.priority === 'low' && 'border-green-200 text-green-600'
                          )}
                        >
                          {item.priority}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mentor Action Items */}
            {summary.mentor_action_items && summary.mentor_action_items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  For Mentor
                </h4>
                <ul className="space-y-2">
                  {summary.mentor_action_items.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5"
                    >
                      <div className="h-4 w-4 rounded-full border-2 border-purple-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {new Date(item.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {item.priority && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs shrink-0',
                            item.priority === 'high' && 'border-red-200 text-red-600',
                            item.priority === 'medium' && 'border-yellow-200 text-yellow-600',
                            item.priority === 'low' && 'border-green-200 text-green-600'
                          )}
                        >
                          {item.priority}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Milestone Updates Card */}
      {summary.milestone_updates && summary.milestone_updates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Milestone Progress
              <Badge variant="secondary" className="text-xs">
                {summary.milestone_updates.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {summary.milestone_updates.map((update) => (
                <li
                  key={update.milestone_id}
                  className="p-3 rounded-lg bg-green-500/5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{update.title}</span>
                    {update.progress_percent !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {update.progress_percent}%
                      </Badge>
                    )}
                  </div>
                  {update.progress_percent !== undefined && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${update.progress_percent}%` }}
                      />
                    </div>
                  )}
                  {update.notes && (
                    <p className="text-xs text-muted-foreground">{update.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
