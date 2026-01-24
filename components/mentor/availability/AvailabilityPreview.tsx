'use client'

import { useState, useMemo } from 'react'
import { Eye, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { TimeSlot } from '@/lib/utils/availability'
import { DAY_NAMES } from '@/lib/utils/availability'
import {
  ALL_TIMEZONES,
  getDetectedTimezone,
  convertTime,
  getTimezoneLabel,
} from '@/lib/utils/timezone'

interface AvailabilityPreviewProps {
  slots: TimeSlot[]
  mentorTimezone: string
  className?: string
}

/**
 * Preview component showing how availability appears to mentees in their timezone.
 * Converts mentor's availability to the viewer's selected timezone.
 */
export function AvailabilityPreview({
  slots,
  mentorTimezone,
  className,
}: AvailabilityPreviewProps) {
  // State for preview timezone
  const [previewTimezone, setPreviewTimezone] = useState(getDetectedTimezone())

  // State for week offset (0 = current week)
  const [weekOffset, setWeekOffset] = useState(0)

  // Get the start of the selected week
  const weekStart = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const start = new Date(today)
    start.setDate(today.getDate() - dayOfWeek + weekOffset * 7)
    start.setHours(0, 0, 0, 0)
    return start
  }, [weekOffset])

  // Get dates for the week
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      return date
    })
  }, [weekStart])

  // Convert slots to preview timezone and group by day
  const convertedSlotsByDay = useMemo(() => {
    const today = new Date()
    const result: Record<number, Array<{
      original: TimeSlot
      convertedStart: string
      convertedEnd: string
      date: Date
      isPast: boolean
    }>> = {}

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      result[i] = []
    }

    // Convert each slot
    slots.forEach((slot) => {
      if (slot.is_active === false) return

      const dayOfWeek = slot.day_of_week
      const date = weekDates[dayOfWeek]

      // Convert times to preview timezone
      const convertedStart = convertTime(
        slot.start_time,
        mentorTimezone,
        previewTimezone,
        date
      )
      const convertedEnd = convertTime(
        slot.end_time,
        mentorTimezone,
        previewTimezone,
        date
      )

      // Check if this slot is in the past
      const [hours, minutes] = convertedEnd.split(':').map(Number)
      const slotEndTime = new Date(date)
      slotEndTime.setHours(hours, minutes, 0, 0)
      const isPast = slotEndTime < today

      result[dayOfWeek].push({
        original: slot,
        convertedStart,
        convertedEnd,
        date,
        isPast,
      })
    })

    // Sort slots within each day by start time
    for (const day of Object.keys(result)) {
      result[parseInt(day)].sort((a, b) => a.convertedStart.localeCompare(b.convertedStart))
    }

    return result
  }, [slots, mentorTimezone, previewTimezone, weekDates])

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

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    })
  }

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Count total available slots this week (excluding past)
  const availableSlotsCount = useMemo(() => {
    return Object.values(convertedSlotsByDay).reduce((acc, slots) => {
      return acc + slots.filter((s) => !s.isPast).length
    }, 0)
  }, [convertedSlotsByDay])

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-5 w-5" />
          Mentee Preview
        </CardTitle>
        <CardDescription>
          See how your availability appears to mentees in their timezone
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timezone selector for preview */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Preview as mentee in:</Label>
          <Select value={previewTimezone} onValueChange={setPreviewTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {ALL_TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {getTimezoneLabel(tz)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset((prev) => prev - 1)}
            disabled={weekOffset <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-sm font-medium">
            {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            {weekOffset === 0 && ' (This week)'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset((prev) => prev + 1)}
            disabled={weekOffset >= 3}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Availability summary */}
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-center">
          {availableSlotsCount > 0 ? (
            <span className="text-green-600 dark:text-green-400">
              {availableSlotsCount} available {availableSlotsCount === 1 ? 'slot' : 'slots'} this week
            </span>
          ) : (
            <span className="text-muted-foreground">No available slots this week</span>
          )}
        </div>

        {/* Weekly slots display */}
        <div className="space-y-3">
          {weekDates.map((date, dayIndex) => {
            const daySlots = convertedSlotsByDay[dayIndex]
            const availableSlots = daySlots.filter((s) => !s.isPast)
            const today = isToday(date)

            return (
              <div
                key={dayIndex}
                className={cn(
                  'rounded-lg border p-3',
                  today && 'border-primary/50 bg-primary/5',
                  availableSlots.length === 0 && 'opacity-60'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-medium text-sm', today && 'text-primary')}>
                      {DAY_NAMES[dayIndex]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(date)}
                    </span>
                    {today && (
                      <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                {availableSlots.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No availability</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {availableSlots.map((slot, idx) => (
                      <div
                        key={`${dayIndex}-${idx}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      >
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime(slot.convertedStart)} - {formatTime(slot.convertedEnd)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Timezone note */}
        <p className="text-xs text-center text-muted-foreground">
          Times shown in {previewTimezone.replace(/_/g, ' ')}
          {mentorTimezone !== previewTimezone && (
            <> (Mentor is in {mentorTimezone.replace(/_/g, ' ')})</>
          )}
        </p>
      </CardContent>
    </Card>
  )
}
