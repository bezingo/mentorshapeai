'use client'

import { useState, useMemo, useEffect } from 'react'
import { Clock, AlertTriangle, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  DAY_NAMES,
  checkSlotOverlap,
  isValidTimeRange,
  getDayName,
} from '@/lib/utils/availability'

interface TimeSlotEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slot?: TimeSlot | null
  existingSlots: TimeSlot[]
  onSave: (slot: Omit<TimeSlot, 'id'> & { id?: string }) => void
  onDelete?: (slotId: string) => void
  timezone?: string
}

/**
 * Generate time options in 15-minute increments
 */
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4)
  const minutes = (i % 4) * 15
  const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  const label = new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
  return { value: time, label }
})

/**
 * Modal for adding or editing time slots.
 * Supports day selection and start/end time pickers with 15-minute increments.
 */
export function TimeSlotEditor({
  open,
  onOpenChange,
  slot,
  existingSlots,
  onSave,
  onDelete,
  timezone,
}: TimeSlotEditorProps) {
  const isEditing = !!slot?.id

  // Form state
  const [dayOfWeek, setDayOfWeek] = useState<number>(slot?.day_of_week ?? 1)
  const [startTime, setStartTime] = useState<string>(slot?.start_time ?? '09:00')
  const [endTime, setEndTime] = useState<string>(slot?.end_time ?? '10:00')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Reset form when slot changes
  useEffect(() => {
    if (slot) {
      setDayOfWeek(slot.day_of_week)
      setStartTime(slot.start_time)
      setEndTime(slot.end_time)
    } else {
      setDayOfWeek(1) // Default to Monday
      setStartTime('09:00')
      setEndTime('10:00')
    }
    setShowDeleteConfirm(false)
  }, [slot, open])

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = []

    // Check time range validity
    if (!isValidTimeRange(startTime, endTime)) {
      errors.push('End time must be after start time')
    }

    // Check for overlapping slots
    const newSlot: TimeSlot = {
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    }

    const { isOverlapping, overlappingSlot } = checkSlotOverlap(
      newSlot,
      existingSlots,
      slot?.id // Exclude current slot when editing
    )

    if (isOverlapping && overlappingSlot) {
      errors.push(
        `Overlaps with existing slot: ${overlappingSlot.start_time} - ${overlappingSlot.end_time}`
      )
    }

    return errors
  }, [dayOfWeek, startTime, endTime, existingSlots, slot?.id])

  const isValid = validationErrors.length === 0

  // Get end time options (only times after start time)
  const endTimeOptions = useMemo(() => {
    return TIME_OPTIONS.filter((t) => t.value > startTime)
  }, [startTime])

  // Handle save
  const handleSave = () => {
    if (!isValid) return

    onSave({
      id: slot?.id,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    })

    onOpenChange(false)
  }

  // Handle delete
  const handleDelete = () => {
    if (slot?.id && onDelete) {
      onDelete(slot.id)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Time Slot' : 'Add Time Slot'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the availability time slot.'
              : 'Add a new availability time slot to your weekly schedule.'}
            {timezone && (
              <span className="block mt-1 text-xs">
                Times are in {timezone.replace(/_/g, ' ')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <>
            <div className="space-y-4 py-4">
              {/* Day Selector */}
              <div className="space-y-2">
                <Label htmlFor="day">Day of Week</Label>
                <Select
                  value={dayOfWeek.toString()}
                  onValueChange={(val) => setDayOfWeek(parseInt(val, 10))}
                >
                  <SelectTrigger id="day" className="w-full">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                {/* Start Time */}
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger id="start-time">
                      <SelectValue placeholder="Start" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* End Time */}
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger id="end-time">
                      <SelectValue placeholder="End" />
                    </SelectTrigger>
                    <SelectContent>
                      {endTimeOptions.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      {validationErrors.map((error, i) => (
                        <p key={i}>{error}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Preview */}
              {isValid && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {getDayName(dayOfWeek)},{' '}
                      {new Date(`2000-01-01T${startTime}`).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(`2000-01-01T${endTime}`).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              {isEditing && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={!isValid}>
                {isEditing ? 'Save Changes' : 'Add Slot'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Delete Confirmation */}
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="mb-2 text-lg font-medium">Delete this slot?</h3>
              <p className="text-sm text-muted-foreground">
                This will remove the {getDayName(dayOfWeek)} slot from your
                availability. This action cannot be undone.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                Delete Slot
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
