'use client'

import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  MessageSquare,
  Video,
  TrendingUp,
  Flag,
  Play,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export interface TimelineEvent {
  id: string
  type: 'created' | 'accepted' | 'declined' | 'active' | 'completed' | 'cancelled' | 'focus' | 'check_in' | 'milestone' | 'message'
  title: string
  description?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

interface CollaborationTimelineProps {
  events: TimelineEvent[]
  className?: string
}

/** Event type configuration */
const eventConfig: Record<
  TimelineEvent['type'],
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  created: { icon: Flag, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  accepted: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  declined: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  active: { icon: Play, color: 'text-primary', bgColor: 'bg-primary/10' },
  completed: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  cancelled: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  focus: { icon: Video, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  check_in: { icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  milestone: { icon: Target, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  message: { icon: MessageSquare, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
}

/**
 * CollaborationTimeline displays a chronological timeline of events
 * in a collaboration (focuses, check-ins, status changes, milestones).
 */
export function CollaborationTimeline({ events, className }: CollaborationTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No events yet</p>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      {/* Events */}
      <div className="space-y-4">
        {events.map((event, index) => {
          const config = eventConfig[event.type]
          const Icon = config.icon
          const isLast = index === events.length - 1

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
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                  </Badge>
                </div>

                {/* Metadata preview */}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    {event.type === 'focus' && event.metadata.scheduled_at ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.metadata.scheduled_at as string), 'PPp')}
                      </div>
                    ) : null}
                    {event.type === 'check_in' && event.metadata.mood_rating ? (
                      <div className="flex items-center gap-1">
                        Mood: {String(event.metadata.mood_rating)}/5
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Helper function to build timeline events from collaboration data
 */
export function buildCollaborationTimeline(collaboration: {
  id: string
  status: string
  created_at: string
  started_at?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  request_message?: string | null
  response_message?: string | null
  mentee_profile?: { display_name: string | null } | null
  mentor_profile?: { display_name: string | null } | null
}): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const menteeName = collaboration.mentee_profile?.display_name || 'Mentee'
  const mentorName = collaboration.mentor_profile?.display_name || 'Mentor'

  // Created event
  events.push({
    id: `${collaboration.id}-created`,
    type: 'created',
    title: 'Collaboration requested',
    description: `${menteeName} requested mentorship from ${mentorName}`,
    timestamp: collaboration.created_at,
  })

  // Status-based events
  if (collaboration.status === 'declined') {
    events.push({
      id: `${collaboration.id}-declined`,
      type: 'declined',
      title: 'Request declined',
      description: collaboration.response_message || undefined,
      timestamp: collaboration.created_at, // Approximate since we don't have declined_at
    })
  }

  if (collaboration.status === 'accepted' || collaboration.status === 'active' || collaboration.status === 'completed') {
    events.push({
      id: `${collaboration.id}-accepted`,
      type: 'accepted',
      title: 'Request accepted',
      description: `${mentorName} accepted the mentorship request`,
      timestamp: collaboration.started_at || collaboration.created_at,
    })
  }

  if (collaboration.status === 'active' || collaboration.status === 'completed') {
    events.push({
      id: `${collaboration.id}-active`,
      type: 'active',
      title: 'Collaboration started',
      description: 'The mentorship journey has begun',
      timestamp: collaboration.started_at || collaboration.created_at,
    })
  }

  if (collaboration.status === 'completed' && collaboration.completed_at) {
    events.push({
      id: `${collaboration.id}-completed`,
      type: 'completed',
      title: 'Goal completed',
      description: 'The goal has been successfully completed',
      timestamp: collaboration.completed_at,
    })
  }

  if (collaboration.status === 'cancelled' && collaboration.cancelled_at) {
    events.push({
      id: `${collaboration.id}-cancelled`,
      type: 'cancelled',
      title: 'Collaboration cancelled',
      timestamp: collaboration.cancelled_at,
    })
  }

  // Sort by timestamp (newest first for display, but reverse for timeline)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
