'use client'

import { useMemo } from 'react'
import { Plus, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TimeSlot } from '@/lib/utils/availability'
import { DAY_NAMES, MAX_SLOTS_PER_DAY, timeToMinutes } from '@/lib/utils/availability'

interface WeeklyScheduleGridProps {
  slots: TimeSlot[]
  busyBlocks?: Array<{
    day_of_week: number
    start_time: string
    end_time: string
  }>
  onAddSlot: (dayOfWeek: number) => void
  onEditSlot: (slot: TimeSlot) => void
  onDeleteSlot: (slotId: string) => void
  timezone?: string
  className?: string
  readonly?: boolean
}

/**
 * Visual 7-day weekly grid showing time slots.
 * Displays available slots in green and busy blocks in gray.
 */
export function WeeklyScheduleGrid({
  slots,
  busyBlocks = [],
  onAddSlot,
  onEditSlot,
  onDeleteSlot,
  timezone,
  className,
  readonly = false,
}: WeeklyScheduleGridProps) {
  // Group slots by day
  const slotsByDay = useMemo(() => {
    const grouped: Record<number, TimeSlot[]> = {}
    for (let i = 0; i < 7; i++) {
      grouped[i] = slots
        .filter((slot) => slot.day_of_week === i && slot.is_active !== false)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
    }
    return grouped
  }, [slots])

  // Group busy blocks by day
  const busyByDay = useMemo(() => {
    const grouped: Record<number, typeof busyBlocks> = {}
    for (let i = 0; i < 7; i++) {
      grouped[i] = busyBlocks.filter((block) => block.day_of_week === i)
    }
    return grouped
  }, [busyBlocks])

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Calculate slot duration
  const getSlotDuration = (start: string, end: string) => {
    const startMin = timeToMinutes(start)
    const endMin = timeToMinutes(end)
    const durationMin = endMin - startMin
    const hours = Math.floor(durationMin / 60)
    const mins = durationMin % 60
    if (hours === 0) return `${mins}min`
    if (mins === 0) return `${hours}hr`
    return `${hours}hr ${mins}min`
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header with timezone info */}
      {timezone && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="h-4 w-4" />
          <span>All times shown in {timezone.replace(/_/g, ' ')}</span>
        </div>
      )}

      {/* Day rows */}
      <div className="space-y-2">
        {DAY_NAMES.map((dayName, dayIndex) => {
          const daySlots = slotsByDay[dayIndex]
          const dayBusy = busyByDay[dayIndex]
          const canAddSlot = daySlots.length < MAX_SLOTS_PER_DAY && !readonly

          return (
            <div
              key={dayIndex}
              className={cn(
                'rounded-lg border p-4 transition-colors',
                daySlots.length > 0 ? 'bg-muted/30' : 'bg-background'
              )}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium min-w-[100px]">{dayName}</span>
                  {daySlots.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {daySlots.length} {daySlots.length === 1 ? 'slot' : 'slots'}
                    </span>
                  )}
                </div>
                {canAddSlot && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddSlot(dayIndex)}
                    className="h-8 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add time
                  </Button>
                )}
                {daySlots.length >= MAX_SLOTS_PER_DAY && !readonly && (
                  <span className="text-xs text-muted-foreground">
                    Max {MAX_SLOTS_PER_DAY} slots
                  </span>
                )}
              </div>

              {/* Time slots */}
              {daySlots.length === 0 && dayBusy.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not available</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {/* Available slots */}
                  {daySlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => !readonly && slot.id && onEditSlot(slot)}
                      disabled={readonly}
                      className={cn(
                        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors',
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                        !readonly && 'hover:bg-green-200 dark:hover:bg-green-900/50 cursor-pointer',
                        readonly && 'cursor-default'
                      )}
                    >
                      <span className="font-medium">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </span>
                      <span className="text-xs opacity-75">
                        {getSlotDuration(slot.start_time, slot.end_time)}
                      </span>
                    </button>
                  ))}

                  {/* Busy blocks */}
                  {dayBusy.map((block, idx) => (
                    <div
                      key={`busy-${idx}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-muted text-muted-foreground"
                    >
                      <AlertCircle className="h-3 w-3" />
                      <span>
                        {formatTime(block.start_time)} - {formatTime(block.end_time)}
                      </span>
                      <span className="text-xs opacity-75">Busy</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-100 dark:bg-green-900/30" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-muted" />
          <span>Busy (from calendar)</span>
        </div>
      </div>
    </div>
  )
}
