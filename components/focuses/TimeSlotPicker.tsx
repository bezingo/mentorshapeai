'use client'

import { useMemo } from 'react'
import { format, parseISO, isSameDay, isToday, isTomorrow } from 'date-fns'
import { Clock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface AvailableSlot {
  availability_id: string
  date: string
  start_time_utc: string
  end_time_utc: string
  original_timezone: string
  start_time_original: string
  end_time_original: string
  target_timezone?: string
  start_time_local?: string
  end_time_local?: string
}

interface TimeSlotPickerProps {
  slots: AvailableSlot[]
  selectedSlot: AvailableSlot | null
  onSelectSlot: (slot: AvailableSlot) => void
  duration: number
  isLoading?: boolean
  timezone?: string
}

interface GroupedSlots {
  date: Date
  dateString: string
  displayDate: string
  slots: AvailableSlot[]
}

/**
 * Format time for display
 */
function formatTime(slot: AvailableSlot): string {
  // Prefer local time if available
  if (slot.start_time_local) {
    return slot.start_time_local
  }
  // Fall back to original time
  return slot.start_time_original
}

/**
 * Get display label for a date
 */
function getDateLabel(date: Date): string {
  if (isToday(date)) {
    return 'Today'
  }
  if (isTomorrow(date)) {
    return 'Tomorrow'
  }
  return format(date, 'EEEE, MMM d')
}

/**
 * TimeSlotPicker component - shows available slots grouped by date
 */
export function TimeSlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  duration,
  isLoading = false,
  timezone,
}: TimeSlotPickerProps) {
  // Group slots by date
  const groupedSlots = useMemo(() => {
    const groups: GroupedSlots[] = []
    const dateMap = new Map<string, AvailableSlot[]>()

    for (const slot of slots) {
      const dateKey = slot.date
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, [])
      }
      dateMap.get(dateKey)!.push(slot)
    }

    // Convert to array and sort by date
    for (const [dateString, dateSlots] of dateMap) {
      const date = parseISO(dateString)
      groups.push({
        date,
        dateString,
        displayDate: getDateLabel(date),
        slots: dateSlots.sort((a, b) =>
          a.start_time_utc.localeCompare(b.start_time_utc)
        ),
      })
    }

    return groups.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [slots])

  // Check if a slot is selected
  const isSlotSelected = (slot: AvailableSlot): boolean => {
    if (!selectedSlot) return false
    return (
      selectedSlot.date === slot.date &&
      selectedSlot.start_time_utc === slot.start_time_utc
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-32 mx-auto mb-2" />
            <div className="h-3 bg-muted rounded w-48 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  if (groupedSlots.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">
          No available slots found
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Try selecting a different date range
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Timezone info */}
      {timezone && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Times shown in {timezone.replace(/_/g, ' ')}</span>
        </div>
      )}

      {/* Grouped slots */}
      {groupedSlots.map((group) => (
        <div key={group.dateString} className="space-y-3">
          {/* Date header */}
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">{group.displayDate}</h4>
            <Badge variant="outline" className="text-xs">
              {group.slots.length} slot{group.slots.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Time slots grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {group.slots.map((slot) => {
              const isSelected = isSlotSelected(slot)
              const timeDisplay = formatTime(slot)

              return (
                <Button
                  key={`${slot.date}-${slot.start_time_utc}`}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-10 text-sm transition-all',
                    isSelected && 'ring-2 ring-primary ring-offset-2'
                  )}
                  onClick={() => onSelectSlot(slot)}
                >
                  {timeDisplay}
                </Button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Duration info */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        Each session is {duration} minutes
      </div>
    </div>
  )
}
