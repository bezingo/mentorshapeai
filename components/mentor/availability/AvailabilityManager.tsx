'use client'

import { useState, useCallback, useEffect } from 'react'
import { Calendar, Clock, Save, RefreshCw, Info, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { TimeSlot } from '@/lib/utils/availability'
import { getDetectedTimezone } from '@/lib/utils/timezone'
import { WeeklyScheduleGrid } from './WeeklyScheduleGrid'
import { TimeSlotEditor } from './TimeSlotEditor'
import { TimezoneSelector } from './TimezoneSelector'
import { AvailabilityPreview } from './AvailabilityPreview'

interface AvailabilityManagerProps {
  initialSlots?: TimeSlot[]
  initialTimezone?: string
  calendarConnected?: boolean
  onSaveSlots?: (slots: TimeSlot[], timezone: string) => Promise<void>
  onRefreshBusy?: () => Promise<void>
  className?: string
  showPreview?: boolean
  showCalendarStatus?: boolean
}

/**
 * Full availability management component with weekly grid and CRUD operations.
 * Combines WeeklyScheduleGrid, TimeSlotEditor, TimezoneSelector, and AvailabilityPreview.
 */
export function AvailabilityManager({
  initialSlots = [],
  initialTimezone,
  calendarConnected = false,
  onSaveSlots,
  onRefreshBusy,
  className,
  showPreview = true,
  showCalendarStatus = true,
}: AvailabilityManagerProps) {
  // State
  const [slots, setSlots] = useState<TimeSlot[]>(initialSlots)
  const [timezone, setTimezone] = useState(initialTimezone || getDetectedTimezone())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null)
  const [addingForDay, setAddingForDay] = useState<number | null>(null)

  // Track changes
  useEffect(() => {
    const initialJSON = JSON.stringify(initialSlots)
    const currentJSON = JSON.stringify(slots)
    setHasChanges(initialJSON !== currentJSON || (initialTimezone && timezone !== initialTimezone))
  }, [slots, timezone, initialSlots, initialTimezone])

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Handle adding a new slot
  const handleAddSlot = useCallback((dayOfWeek: number) => {
    setEditingSlot(null)
    setAddingForDay(dayOfWeek)
    setEditorOpen(true)
  }, [])

  // Handle editing an existing slot
  const handleEditSlot = useCallback((slot: TimeSlot) => {
    setEditingSlot(slot)
    setAddingForDay(null)
    setEditorOpen(true)
  }, [])

  // Handle saving a slot from the editor
  const handleSaveSlot = useCallback(
    (slotData: Omit<TimeSlot, 'id'> & { id?: string }) => {
      setError(null)

      if (slotData.id) {
        // Update existing slot
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotData.id
              ? { ...s, ...slotData }
              : s
          )
        )
      } else {
        // Add new slot with temporary ID
        const newSlot: TimeSlot = {
          ...slotData,
          id: `temp-${Date.now()}`,
          timezone,
          is_active: true,
        }
        setSlots((prev) => [...prev, newSlot])
      }

      setEditorOpen(false)
      setEditingSlot(null)
      setAddingForDay(null)
    },
    [timezone]
  )

  // Handle deleting a slot
  const handleDeleteSlot = useCallback((slotId: string) => {
    setError(null)
    setSlots((prev) => prev.filter((s) => s.id !== slotId))
    setEditorOpen(false)
    setEditingSlot(null)
  }, [])

  // Handle saving all changes
  const handleSaveAll = useCallback(async () => {
    if (!onSaveSlots) return

    setError(null)
    setIsSaving(true)

    try {
      await onSaveSlots(slots, timezone)
      setHasChanges(false)
      setSuccessMessage('Availability saved successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save availability')
    } finally {
      setIsSaving(false)
    }
  }, [slots, timezone, onSaveSlots])

  // Handle refreshing busy blocks
  const handleRefreshBusy = useCallback(async () => {
    if (!onRefreshBusy) return

    setError(null)
    setIsRefreshing(true)

    try {
      await onRefreshBusy()
      setSuccessMessage('Calendar synced!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync calendar')
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefreshBusy])

  // Handle timezone change
  const handleTimezoneChange = useCallback((newTimezone: string) => {
    setTimezone(newTimezone)
    // Update timezone on all slots
    setSlots((prev) =>
      prev.map((slot) => ({ ...slot, timezone: newTimezone }))
    )
  }, [])

  // Create the slot to edit, with day override for new slots
  const slotForEditor = editingSlot
    ? editingSlot
    : addingForDay !== null
    ? { day_of_week: addingForDay, start_time: '09:00', end_time: '10:00' }
    : null

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Timezone and Calendar Status */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Timezone Selector */}
        <TimezoneSelector
          value={timezone}
          onChange={handleTimezoneChange}
          label="Your Timezone"
          showDetectedTimezone
          className="sm:max-w-xs"
        />

        {/* Calendar Status and Actions */}
        <div className="flex flex-col sm:items-end gap-2">
          {showCalendarStatus && (
            <div className="flex items-center gap-2">
              {calendarConnected ? (
                <>
                  <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                    <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400" />
                    Calendar connected
                  </div>
                  {onRefreshBusy && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshBusy}
                      disabled={isRefreshing}
                    >
                      <RefreshCw
                        className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                      />
                      {isRefreshing ? 'Syncing...' : 'Sync'}
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Calendar not connected
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          {onSaveSlots && (
            <Button
              type="button"
              onClick={handleSaveAll}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg border border-green-500/50 bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {/* Info Note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="text-muted-foreground">
          <p>
            Set your weekly availability for focus sessions. Mentees will see
            these times converted to their local timezone.
          </p>
          {calendarConnected && (
            <p className="mt-1">
              Your Google Calendar busy times will automatically block availability.
            </p>
          )}
        </div>
      </div>

      {/* Main Content - Grid and Preview side by side on larger screens */}
      <div className={cn('grid gap-6', showPreview && 'lg:grid-cols-[1fr,400px]')}>
        {/* Weekly Schedule Grid */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Weekly Schedule
          </Label>
          <WeeklyScheduleGrid
            slots={slots}
            onAddSlot={handleAddSlot}
            onEditSlot={handleEditSlot}
            onDeleteSlot={handleDeleteSlot}
            timezone={timezone}
          />
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <AvailabilityPreview
            slots={slots}
            mentorTimezone={timezone}
          />
        )}
      </div>

      {/* Time Slot Editor Modal */}
      <TimeSlotEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        slot={slotForEditor}
        existingSlots={slots}
        onSave={handleSaveSlot}
        onDelete={editingSlot?.id ? handleDeleteSlot : undefined}
        timezone={timezone}
      />

      {/* Unsaved Changes Indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="flex items-center gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 px-4 py-2 text-sm text-amber-800 dark:text-amber-200 shadow-lg">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            You have unsaved changes
          </div>
        </div>
      )}
    </div>
  )
}
