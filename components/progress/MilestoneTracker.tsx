'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  Target,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export type MilestoneStatus = 'completed' | 'in_progress' | 'pending' | 'locked'

export interface Milestone {
  id: string
  title: string
  description?: string | null
  status: MilestoneStatus
  dueDate?: string | null
  completedAt?: string | null
  order: number
}

interface MilestoneTrackerProps {
  milestones: Milestone[]
  className?: string
  /** Callback when milestone is clicked */
  onMilestoneClick?: (milestone: Milestone) => void
  /** Show as compact list */
  compact?: boolean
}

/** Status configuration */
const statusConfig: Record<
  MilestoneStatus,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'Completed',
  },
  in_progress: {
    icon: Clock,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    label: 'In Progress',
  },
  pending: {
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Pending',
  },
  locked: {
    icon: Lock,
    color: 'text-muted-foreground/50',
    bgColor: 'bg-muted/50',
    label: 'Locked',
  },
}

/**
 * MilestoneTracker displays a checklist of milestones with status icons,
 * progress indicator, and optional due dates.
 */
export function MilestoneTracker({
  milestones,
  className,
  onMilestoneClick,
  compact = false,
}: MilestoneTrackerProps) {
  // Sort milestones by order
  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order)

  // Calculate progress
  const completedCount = milestones.filter((m) => m.status === 'completed').length
  const totalCount = milestones.length
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (milestones.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Target className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No milestones defined</p>
          <p className="text-xs text-muted-foreground mt-1">
            Milestones help track progress toward your goal
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Milestones</CardTitle>
            <CardDescription>
              {completedCount} of {totalCount} completed
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {progressPercentage}%
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('space-y-1', !compact && 'space-y-3')}>
          {sortedMilestones.map((milestone, index) => {
            const config = statusConfig[milestone.status]
            const StatusIcon = config.icon
            const isClickable = onMilestoneClick && milestone.status !== 'locked'
            const isLast = index === sortedMilestones.length - 1

            return (
              <div
                key={milestone.id}
                className={cn(
                  'relative',
                  !compact && !isLast && 'pb-3'
                )}
              >
                {/* Connector line (non-compact only) */}
                {!compact && !isLast && (
                  <div
                    className={cn(
                      'absolute left-3.5 top-8 bottom-0 w-0.5',
                      milestone.status === 'completed' ? 'bg-green-200 dark:bg-green-900/50' : 'bg-border'
                    )}
                  />
                )}

                <div
                  onClick={() => isClickable && onMilestoneClick(milestone)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg transition-colors',
                    !compact && 'p-2 -mx-2',
                    isClickable && 'cursor-pointer hover:bg-muted/50',
                    milestone.status === 'locked' && 'opacity-50'
                  )}
                >
                  {/* Status icon */}
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-background',
                      config.bgColor
                    )}
                  >
                    <StatusIcon className={cn('h-4 w-4', config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          'font-medium text-sm truncate',
                          milestone.status === 'completed' && 'line-through text-muted-foreground'
                        )}
                      >
                        {milestone.title}
                      </p>
                      {isClickable && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    {!compact && milestone.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {milestone.description}
                      </p>
                    )}

                    {/* Date info */}
                    <div className="flex items-center gap-2 mt-1">
                      {milestone.completedAt && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {format(new Date(milestone.completedAt), 'MMM d')}
                        </span>
                      )}
                      {milestone.dueDate && !milestone.completedAt && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due {format(new Date(milestone.dueDate), 'MMM d')}
                        </span>
                      )}
                      {!compact && (
                        <Badge variant="outline" className="text-xs h-5">
                          {config.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
