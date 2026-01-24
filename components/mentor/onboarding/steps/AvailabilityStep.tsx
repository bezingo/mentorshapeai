'use client'

import { useCallback } from 'react'
import { Plus, Trash2, Calendar, Clock, Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOnboardingState } from '@/hooks/use-onboarding-state'
import { cn } from '@/lib/utils'
import type { AvailabilitySlot } from '@/lib/validations/onboarding'

/**
 * Days of the week
 */
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

/**
 * Time options (30-minute intervals)
 */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
  const minutes = (i % 2) * 30
  const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  const label = new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
  return { value: time, label }
})

const MAX_SLOTS_PER_DAY = 5

/**
 * Step 4: Weekly Availability Setup
 * Allows mentors to set their weekly availability patterns
 */
export function AvailabilityStep() {
  const { formData, updateFormData } = useOnboardingState()

  const availability = formData.availability || []
  const timezone = formData.timezone || 'UTC'
  const calendarConnected = formData.calendarConnected || false

  // Group slots by day
  const slotsByDay = DAYS_OF_WEEK.map((day) => ({
    ...day,
    slots: availability.filter((slot) => slot.day_of_week === day.value),
  }))

  // Count total slots
  const totalSlots = availability.length

  // Add new slot
  const handleAddSlot = useCallback(
    (dayOfWeek: number) => {
      const daySlots = availability.filter((s) => s.day_of_week === dayOfWeek)
      if (daySlots.length >= MAX_SLOTS_PER_DAY) return

      // Default to 9am-10am, or next hour after last slot
      let startTime = '09:00'
      let endTime = '10:00'

      if (daySlots.length > 0) {
        const lastSlot = daySlots[daySlots.length - 1]
        const lastEndHour = parseInt(lastSlot.end_time.split(':')[0])
        if (lastEndHour < 23) {
          startTime = lastSlot.end_time
          endTime = `${(lastEndHour + 1).toString().padStart(2, '0')}:00`
        }
      }

      const newSlot: AvailabilitySlot = {
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      }

      updateFormData({ availability: [...availability, newSlot] })
    },
    [availability, updateFormData]
  )

  // Update slot time
  const handleUpdateSlot = useCallback(
    (index: number, field: 'start_time' | 'end_time', value: string) => {
      const newAvailability = [...availability]
      newAvailability[index] = { ...newAvailability[index], [field]: value }
      updateFormData({ availability: newAvailability })
    },
    [availability, updateFormData]
  )

  // Remove slot
  const handleRemoveSlot = useCallback(
    (index: number) => {
      const newAvailability = availability.filter((_, i) => i !== index)
      updateFormData({ availability: newAvailability })
    },
    [availability, updateFormData]
  )

  // Get slot index in the main array
  const getSlotIndex = (dayOfWeek: number, slotIndexInDay: number): number => {
    let count = 0
    for (let i = 0; i < availability.length; i++) {
      if (availability[i].day_of_week === dayOfWeek) {
        if (count === slotIndexInDay) return i
        count++
      }
    }
    return -1
  }

  // Handle Google Calendar connect
  const handleCalendarConnect = async () => {
    try {
      const response = await fetch('/api/mentor/calendar/auth-url')
      const data = await response.json()
      if (data.data?.auth_url) {
        window.location.href = data.data.auth_url
      }
    } catch {
      // Calendar connection is optional, just log the error
      console.error('Failed to get calendar auth URL')
    }
  }

  return (
    <div className="space-y-8 py-4">
      <div>
        <h2 className="text-2xl font-semibold">Availability</h2>
        <p className="text-muted-foreground mt-1">
          Set your weekly availability for focus sessions. You can always adjust
          this later.
        </p>
      </div>

      {/* Optional Google Calendar Card */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect your calendar to automatically block times when you&apos;re busy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calendarConnected ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="h-2 w-2 rounded-full bg-green-600" />
              Calendar connected
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleCalendarConnect}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Connect Google Calendar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Info note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="text-muted-foreground">
          <p>
            <strong>Timezone:</strong> {timezone}
          </p>
          <p className="mt-1">
            All times are shown in your timezone. Mentees will see availability
            converted to their local time.
          </p>
        </div>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Weekly Schedule</Label>
          <span className="text-xs text-muted-foreground">
            {totalSlots} time {totalSlots === 1 ? 'slot' : 'slots'} set
          </span>
        </div>

        <div className="space-y-3">
          {slotsByDay.map((day) => (
            <div
              key={day.value}
              className={cn(
                'rounded-lg border p-4',
                day.slots.length > 0 && 'bg-muted/30'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">{day.label}</span>
                {day.slots.length < MAX_SLOTS_PER_DAY && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddSlot(day.value)}
                    className="h-8 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add time
                  </Button>
                )}
              </div>

              {day.slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not available</p>
              ) : (
                <div className="space-y-2">
                  {day.slots.map((slot, slotIndexInDay) => {
                    const globalIndex = getSlotIndex(day.value, slotIndexInDay)
                    return (
                      <div
                        key={`${day.value}-${slotIndexInDay}`}
                        className="flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Select
                          value={slot.start_time}
                          onValueChange={(value) =>
                            handleUpdateSlot(globalIndex, 'start_time', value)
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">to</span>
                        <Select
                          value={slot.end_time}
                          onValueChange={(value) =>
                            handleUpdateSlot(globalIndex, 'end_time', value)
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.filter(
                              (t) => t.value > slot.start_time
                            ).map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSlot(globalIndex)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Skip message */}
      <p className="text-sm text-muted-foreground text-center">
        Setting availability is optional. You can skip this step and configure it
        later from your dashboard.
      </p>
    </div>
  )
}
