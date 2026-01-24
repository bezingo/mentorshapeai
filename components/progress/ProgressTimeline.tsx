'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Video,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Clock,
  Target,
  Smile,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export type ProgressEventType = 'focus' | 'check_in' | 'score' | 'milestone' | 'action_item'

export interface ProgressEvent {
  id: string
  type: ProgressEventType
  title: string
  description?: string | null
  timestamp: string
  metadata?: {
    score?: number
    trend?: 'up' | 'down' | 'stable'
    moodRating?: number
    status?: string
    duration?: number
  }
}

interface ProgressTimelineProps {
  events: ProgressEvent[]
  className?: string
  /** Maximum events to show */
  limit?: number
  /** Show "load more" button */
  onLoadMore?: () => void
  hasMore?: boolean
}

/** Event type configuration */
const eventConfig: Record<
  ProgressEventType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  focus: {
    icon: Video,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  check_in: {
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  score: {
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  milestone: {
    icon: Target,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  action_item: {
    icon: CheckCircle2,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
}

/** Mood emoji for check-ins */
const moodEmojis: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
}

/**
 * ProgressTimeline displays a chronological timeline of progress events
 * including focuses, check-ins, progress scores, and milestones.
 */
export function ProgressTimeline({
  events,
  className,
  limit,
  onLoadMore,
  hasMore = false,
}: ProgressTimelineProps) {
  // Apply limit if specified
  const displayedEvents = limit ? events.slice(0, limit) : events

  // Group events by date
  const groupedEvents = displayedEvents.reduce(
    (groups, event) => {
      const date = format(new Date(event.timestamp), 'yyyy-MM-dd')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(event)
      return groups
    },
    {} as Record<string, ProgressEvent[]>
  )

  const sortedDates = Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a))

  if (events.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your progress timeline will appear here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Activity Timeline</CardTitle>
        <CardDescription>
          Your progress journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* Grouped events by date */}
          <div className="space-y-6">
            {sortedDates.map((date) => {
              const dateEvents = groupedEvents[date]
              const displayDate = new Date(date)

              return (
                <div key={date}>
                  {/* Date header */}
                  <div className="relative pl-10 mb-3">
                    <div className="absolute left-2 w-4 h-4 rounded-full bg-background border-2 border-muted-foreground/30" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {format(displayDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>

                  {/* Events for this date */}
                  <div className="space-y-3">
                    {dateEvents.map((event, index) => {
                      const config = eventConfig[event.type]
                      const Icon = config.icon
                      const isLast = index === dateEvents.length - 1

                      return (
                        <div key={event.id} className="relative pl-10">
                          {/* Event icon */}
                          <div
                            className={cn(
                              'absolute left-0 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-background',
                              config.bgColor
                            )}
                          >
                            <Icon className={cn('h-4 w-4', config.color)} />
                          </div>

                          {/* Event content */}
                          <div
                            className={cn(
                              'rounded-lg border bg-card p-3',
                              !isLast && 'mb-2'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 flex-1 min-w-0">
                                <p className="font-medium text-sm">{event.title}</p>
                                {event.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="shrink-0 text-xs">
                                {format(new Date(event.timestamp), 'h:mm a')}
                              </Badge>
                            </div>

                            {/* Metadata display */}
                            {event.metadata && (
                              <div className="mt-2 pt-2 border-t flex items-center gap-3 flex-wrap">
                                {/* Progress score */}
                                {event.type === 'score' && event.metadata.score != null && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-primary">
                                      {event.metadata.score}%
                                    </span>
                                    {event.metadata.trend && (
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'text-xs',
                                          event.metadata.trend === 'up'
                                            ? 'text-green-600'
                                            : event.metadata.trend === 'down'
                                              ? 'text-red-600'
                                              : 'text-yellow-600'
                                        )}
                                      >
                                        {event.metadata.trend === 'up'
                                          ? '↑ Improving'
                                          : event.metadata.trend === 'down'
                                            ? '↓ Declining'
                                            : '→ Stable'}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Check-in mood */}
                                {event.type === 'check_in' && event.metadata.moodRating && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-xl">
                                      {moodEmojis[event.metadata.moodRating] || '😐'}
                                    </span>
                                    <span className="text-muted-foreground">
                                      Mood: {event.metadata.moodRating}/5
                                    </span>
                                  </div>
                                )}

                                {/* Focus duration */}
                                {event.type === 'focus' && event.metadata.duration && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {event.metadata.duration} min
                                  </div>
                                )}

                                {/* Milestone/action item status */}
                                {(event.type === 'milestone' || event.type === 'action_item') &&
                                  event.metadata.status && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {event.metadata.status.replace('_', ' ')}
                                    </Badge>
                                  )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load more button */}
          {hasMore && onLoadMore && (
            <div className="mt-4 text-center">
              <button
                onClick={onLoadMore}
                className="text-sm text-primary hover:underline"
              >
                Load more activity
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Helper to build timeline events from various data sources
 */
export function buildProgressTimeline({
  focuses,
  checkIns,
  progressScores,
  actionItems,
}: {
  focuses?: Array<{
    id: string
    scheduled_at: string
    status: string
    duration_minutes: number
  }>
  checkIns?: Array<{
    id: string
    week_start: string
    mood_rating: number
    progress_notes?: string | null
    created_at: string
  }>
  progressScores?: Array<{
    id: string
    score: number
    trend: string
    generated_at: string
  }>
  actionItems?: Array<{
    id: string
    title: string
    status: string
    completed_at?: string | null
  }>
}): ProgressEvent[] {
  const events: ProgressEvent[] = []

  // Add focus events
  focuses?.forEach((focus) => {
    events.push({
      id: `focus-${focus.id}`,
      type: 'focus',
      title: focus.status === 'completed' ? 'Focus session completed' : 'Focus session',
      description: `${focus.duration_minutes} minute mentoring session`,
      timestamp: focus.scheduled_at,
      metadata: {
        status: focus.status,
        duration: focus.duration_minutes,
      },
    })
  })

  // Add check-in events
  checkIns?.forEach((checkIn) => {
    events.push({
      id: `checkin-${checkIn.id}`,
      type: 'check_in',
      title: 'Weekly check-in submitted',
      description: checkIn.progress_notes?.slice(0, 100) || undefined,
      timestamp: checkIn.created_at,
      metadata: {
        moodRating: checkIn.mood_rating,
      },
    })
  })

  // Add progress score events
  progressScores?.forEach((score) => {
    events.push({
      id: `score-${score.id}`,
      type: 'score',
      title: 'Progress score updated',
      timestamp: score.generated_at,
      metadata: {
        score: score.score,
        trend: score.trend as 'up' | 'down' | 'stable',
      },
    })
  })

  // Add completed action item events
  actionItems
    ?.filter((item) => item.status === 'completed' && item.completed_at)
    .forEach((item) => {
      events.push({
        id: `action-${item.id}`,
        type: 'action_item',
        title: 'Action item completed',
        description: item.title,
        timestamp: item.completed_at!,
        metadata: {
          status: item.status,
        },
      })
    })

  // Sort by timestamp (newest first)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
