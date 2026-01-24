'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  ListTodo,
  Filter,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { type ActionItemStatus } from '@/lib/validations/action-items'

export interface ActionItem {
  id: string
  title: string
  description?: string | null
  status: ActionItemStatus
  dueDate?: string | null
  assigneeId: string
  assigneeName?: string | null
  completedAt?: string | null
  createdAt: string
}

interface ActionItemsListProps {
  items: ActionItem[]
  currentUserId: string
  className?: string
  /** Callback when item status is toggled */
  onStatusChange?: (itemId: string, newStatus: ActionItemStatus) => Promise<void>
  /** Show filter controls */
  showFilters?: boolean
  /** Max items to show initially (show more button) */
  initialLimit?: number
}

type FilterStatus = 'all' | ActionItemStatus

/** Status configuration */
const statusConfig: Record<
  ActionItemStatus,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  pending: {
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Pending',
  },
  in_progress: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'In Progress',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'Done',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Cancelled',
  },
}

/** Get due date display */
function getDueDateDisplay(dueDate: string): {
  text: string
  isOverdue: boolean
  isUrgent: boolean
} {
  const date = new Date(dueDate)
  const isOverdue = isPast(date) && !isToday(date)
  const isUrgent = isToday(date) || isTomorrow(date)

  let text: string
  if (isToday(date)) {
    text = 'Today'
  } else if (isTomorrow(date)) {
    text = 'Tomorrow'
  } else if (isOverdue) {
    text = `Overdue (${format(date, 'MMM d')})`
  } else {
    text = format(date, 'MMM d')
  }

  return { text, isOverdue, isUrgent }
}

/**
 * ActionItemsList displays action items with checkboxes, due dates,
 * status filters, and the ability to toggle completion.
 */
export function ActionItemsList({
  items,
  currentUserId,
  className,
  onStatusChange,
  showFilters = true,
  initialLimit = 10,
}: ActionItemsListProps) {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [showAll, setShowAll] = useState(false)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true
    return item.status === filter
  })

  // Limit displayed items
  const displayedItems = showAll ? filteredItems : filteredItems.slice(0, initialLimit)
  const hasMore = filteredItems.length > initialLimit

  // Count by status
  const statusCounts = items.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    },
    {} as Record<ActionItemStatus, number>
  )

  const handleToggle = async (item: ActionItem) => {
    if (!onStatusChange || loadingIds.has(item.id)) return

    // Determine new status
    let newStatus: ActionItemStatus
    if (item.status === 'completed') {
      newStatus = 'pending'
    } else if (item.status === 'pending') {
      newStatus = 'completed'
    } else {
      return // Don't toggle in_progress or cancelled items with checkbox
    }

    setLoadingIds((prev) => new Set(prev).add(item.id))
    try {
      await onStatusChange(item.id, newStatus)
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ListTodo className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No action items yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Action items will appear here after focus sessions
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
            <CardTitle className="text-base">Action Items</CardTitle>
            <CardDescription>
              {statusCounts.completed || 0} of {items.length} completed
            </CardDescription>
          </div>
          {showFilters && (
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-muted-foreground mr-1" />
              {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFilter(status)}
                >
                  {status === 'all' ? 'All' : statusConfig[status as ActionItemStatus].label}
                  {status !== 'all' && statusCounts[status as ActionItemStatus] > 0 && (
                    <span className="ml-1 text-muted-foreground">
                      ({statusCounts[status as ActionItemStatus]})
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayedItems.map((item) => {
            const config = statusConfig[item.status]
            const StatusIcon = config.icon
            const isLoading = loadingIds.has(item.id)
            const isAssignedToMe = item.assigneeId === currentUserId
            const canToggle = onStatusChange && ['pending', 'completed'].includes(item.status)

            // Due date info
            const dueDateInfo = item.dueDate ? getDueDateDisplay(item.dueDate) : null

            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg p-2 -mx-2 transition-colors',
                  canToggle && 'cursor-pointer hover:bg-muted/50',
                  isLoading && 'opacity-50'
                )}
                onClick={() => canToggle && handleToggle(item)}
              >
                {/* Checkbox / Status icon */}
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded mt-0.5',
                    canToggle ? 'hover:bg-muted' : ''
                  )}
                >
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : item.status === 'pending' ? (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <StatusIcon className={cn('h-5 w-5', config.color)} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm',
                      item.status === 'completed' && 'line-through text-muted-foreground'
                    )}
                  >
                    {item.title}
                  </p>

                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {/* Due date */}
                    {dueDateInfo && item.status !== 'completed' && (
                      <span
                        className={cn(
                          'text-xs flex items-center gap-1',
                          dueDateInfo.isOverdue
                            ? 'text-red-600'
                            : dueDateInfo.isUrgent
                              ? 'text-orange-600'
                              : 'text-muted-foreground'
                        )}
                      >
                        {dueDateInfo.isOverdue && <AlertCircle className="h-3 w-3" />}
                        <Clock className="h-3 w-3" />
                        {dueDateInfo.text}
                      </span>
                    )}

                    {/* Assignee */}
                    {!isAssignedToMe && item.assigneeName && (
                      <Badge variant="outline" className="text-xs h-5">
                        {item.assigneeName}
                      </Badge>
                    )}

                    {/* Status badge for non-standard statuses */}
                    {!['pending', 'completed'].includes(item.status) && (
                      <Badge variant="outline" className={cn('text-xs h-5', config.color)}>
                        {config.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Show more button */}
        {hasMore && !showAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4"
            onClick={() => setShowAll(true)}
          >
            Show {filteredItems.length - initialLimit} more
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        )}

        {showAll && hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4"
            onClick={() => setShowAll(false)}
          >
            Show less
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
