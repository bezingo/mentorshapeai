'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays, startOfDay } from 'date-fns'
import {
  Calendar,
  Clock,
  Video,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TimeSlotPicker, type AvailableSlot } from './TimeSlotPicker'
import { cn } from '@/lib/utils'
import { FocusDurations } from '@/lib/validations/focus'

interface FocusBookingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collaborationId: string
  mentorProfileId: string
  mentorName?: string
  onBook: (data: {
    scheduled_at: string
    duration_minutes: number
  }) => Promise<void>
}

/**
 * FocusBookingModal - Modal for booking focuses with calendar view and slot picker
 */
export function FocusBookingModal({
  open,
  onOpenChange,
  collaborationId,
  mentorProfileId,
  mentorName = 'mentor',
  onBook,
}: FocusBookingModalProps) {
  // Date range state
  const [startDate, setStartDate] = useState<Date>(() => startOfDay(new Date()))
  const [endDate, setEndDate] = useState<Date>(() =>
    startOfDay(addDays(new Date(), 13))
  )

  // Selection state
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [duration, setDuration] = useState<number>(60)

  // Loading states
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isBooking, setIsBooking] = useState(false)

  // Data state
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userTimezone, setUserTimezone] = useState<string>('UTC')

  // Get user's timezone on mount
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      setUserTimezone(tz)
    } catch {
      setUserTimezone('UTC')
    }
  }, [])

  // Fetch available slots
  const fetchSlots = useCallback(async () => {
    setIsLoadingSlots(true)
    setError(null)

    try {
      const fromDate = format(startDate, 'yyyy-MM-dd')
      const toDate = format(endDate, 'yyyy-MM-dd')

      const params = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        timezone: userTimezone,
        profile_id: mentorProfileId,
      })

      const response = await fetch(`/api/mentor/availability/slots?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch available slots')
      }

      setAvailableSlots(result.data?.slots || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability')
      setAvailableSlots([])
    } finally {
      setIsLoadingSlots(false)
    }
  }, [startDate, endDate, mentorProfileId, userTimezone])

  // Fetch slots when modal opens or date range changes
  useEffect(() => {
    if (open && mentorProfileId) {
      fetchSlots()
    }
  }, [open, fetchSlots, mentorProfileId])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedSlot(null)
      setError(null)
    }
  }, [open])

  // Navigate date range
  const navigateDates = (direction: 'prev' | 'next') => {
    const days = 14
    if (direction === 'prev') {
      const newStart = addDays(startDate, -days)
      // Don't go before today
      if (newStart >= startOfDay(new Date())) {
        setStartDate(newStart)
        setEndDate(addDays(newStart, days - 1))
      } else {
        setStartDate(startOfDay(new Date()))
        setEndDate(addDays(startOfDay(new Date()), days - 1))
      }
    } else {
      setStartDate(addDays(startDate, days))
      setEndDate(addDays(endDate, days))
    }
    setSelectedSlot(null)
  }

  // Handle booking
  const handleBook = async () => {
    if (!selectedSlot) return

    setIsBooking(true)
    setError(null)

    try {
      await onBook({
        scheduled_at: selectedSlot.start_time_utc,
        duration_minutes: duration,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book session')
    } finally {
      setIsBooking(false)
    }
  }

  // Check if we can go to previous dates
  const canGoPrev = startDate > startOfDay(new Date())

  // Format selected time for display
  const getSelectedTimeDisplay = () => {
    if (!selectedSlot) return null

    const date = new Date(selectedSlot.start_time_utc)
    return {
      date: format(date, 'EEEE, MMMM d, yyyy'),
      time: selectedSlot.start_time_local || selectedSlot.start_time_original,
    }
  }

  const selectedTimeDisplay = getSelectedTimeDisplay()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book a Focus Session
          </DialogTitle>
          <DialogDescription>
            Select a time slot to schedule a focus session with {mentorName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Duration Selector */}
          <div className="space-y-2">
            <Label>Session Duration</Label>
            <Select
              value={duration.toString()}
              onValueChange={(val) => setDuration(parseInt(val, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {FocusDurations.map((d) => (
                  <SelectItem key={d} value={d.toString()}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {d} minutes
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Navigation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Available Times</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateDates('prev')}
                  disabled={!canGoPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateDates('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Slot Picker */}
            <div className="border rounded-lg p-4">
              <TimeSlotPicker
                slots={availableSlots}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                duration={duration}
                isLoading={isLoadingSlots}
                timezone={userTimezone}
              />
            </div>
          </div>

          {/* Selection Summary */}
          {selectedSlot && selectedTimeDisplay && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{selectedTimeDisplay.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span>{selectedTimeDisplay.time}</span>
                <Badge variant="outline" className="ml-auto">
                  {duration} min
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Video className="h-4 w-4" />
                <span>Zoom meeting will be created automatically</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBooking}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleBook}
            disabled={!selectedSlot || isBooking}
          >
            {isBooking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Book Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
