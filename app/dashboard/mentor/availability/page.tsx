'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AvailabilityManager } from '@/components/mentor/availability/AvailabilityManager'
import { CalendarConnectCard } from '@/components/mentor/calendar/CalendarConnectCard'
import { CalendarConnectionStatus } from '@/components/mentor/calendar/CalendarConnectionStatus'
import type { TimeSlot } from '@/lib/utils/availability'
import Link from 'next/link'

interface CalendarConnection {
  id: string
  provider: string
  calendar_id: string | null
  last_sync_at: string | null
  connected_at: string
}

export default function MentorAvailabilityPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [timezone, setTimezone] = useState<string>('')
  const [calendarConnection, setCalendarConnection] = useState<CalendarConnection | null>(null)

  // Fetch availability and calendar status on mount
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch availability slots
        const availResponse = await fetch('/api/mentor/availability')
        const availResult = await availResponse.json()

        if (!availResponse.ok) {
          throw new Error(availResult.error?.message || 'Failed to fetch availability')
        }

        const fetchedSlots = availResult.data || []
        setSlots(fetchedSlots)

        // Get timezone from first slot or default
        if (fetchedSlots.length > 0 && fetchedSlots[0].timezone) {
          setTimezone(fetchedSlots[0].timezone)
        }

        // Fetch calendar connection status
        try {
          const calResponse = await fetch('/api/mentor/calendar/auth-url')
          const calResult = await calResponse.json()
          
          // If there's connection data in the response
          if (calResult.data?.connection) {
            setCalendarConnection(calResult.data.connection)
          }
        } catch {
          // Calendar connection check failed, not critical
          console.log('Calendar connection check skipped')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load availability')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Save slots to the server
  const handleSaveSlots = useCallback(async (newSlots: TimeSlot[], newTimezone: string) => {
    // Get existing slot IDs (non-temp IDs)
    const existingIds = slots
      .filter(s => !s.id.startsWith('temp-'))
      .map(s => s.id)

    // Determine slots to create, update, and delete
    const slotsToCreate = newSlots.filter(s => s.id.startsWith('temp-'))
    const slotsToUpdate = newSlots.filter(s => !s.id.startsWith('temp-') && existingIds.includes(s.id))
    const idsToDelete = existingIds.filter(id => !newSlots.find(s => s.id === id))

    // Create new slots
    for (const slot of slotsToCreate) {
      const response = await fetch('/api/mentor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          timezone: newTimezone,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message || 'Failed to create slot')
      }
    }

    // Update existing slots
    for (const slot of slotsToUpdate) {
      const response = await fetch(`/api/mentor/availability/${slot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          timezone: newTimezone,
          is_active: slot.is_active,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message || 'Failed to update slot')
      }
    }

    // Delete removed slots
    for (const id of idsToDelete) {
      const response = await fetch(`/api/mentor/availability/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message || 'Failed to delete slot')
      }
    }

    // Refresh the slots list
    const response = await fetch('/api/mentor/availability')
    const result = await response.json()
    if (response.ok) {
      setSlots(result.data || [])
      setTimezone(newTimezone)
    }
  }, [slots])

  // Refresh busy blocks from calendar
  const handleRefreshBusy = useCallback(async () => {
    const response = await fetch('/api/mentor/calendar/sync', {
      method: 'POST',
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error?.message || 'Failed to sync calendar')
    }
  }, [])

  // Handle calendar disconnect
  const handleDisconnect = useCallback(async () => {
    const response = await fetch('/api/mentor/calendar/disconnect', {
      method: 'DELETE',
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error?.message || 'Failed to disconnect calendar')
    }

    setCalendarConnection(null)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/mentor">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link href="/dashboard/mentor">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Availability</h1>
          <p className="text-muted-foreground">
            Set your weekly availability for mentees to book sessions.
          </p>
        </div>
      </div>

      {/* Calendar Connection Section */}
      <div className="max-w-md">
        {calendarConnection ? (
          <CalendarConnectionStatus
            connection={{
              provider: calendarConnection.provider,
              calendarId: calendarConnection.calendar_id,
              lastSyncAt: calendarConnection.last_sync_at,
              connectedAt: calendarConnection.connected_at,
            }}
            onDisconnect={handleDisconnect}
            onSync={handleRefreshBusy}
          />
        ) : (
          <CalendarConnectCard
            onConnect={() => {
              // Redirect to Google OAuth
              window.location.href = '/api/mentor/calendar/auth-url'
            }}
          />
        )}
      </div>

      {/* Availability Manager */}
      <AvailabilityManager
        initialSlots={slots}
        initialTimezone={timezone}
        calendarConnected={!!calendarConnection}
        onSaveSlots={handleSaveSlots}
        onRefreshBusy={calendarConnection ? handleRefreshBusy : undefined}
        showPreview={true}
        showCalendarStatus={false}
      />
    </div>
  )
}
