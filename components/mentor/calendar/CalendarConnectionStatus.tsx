'use client'

import { useState } from 'react'
import { Calendar, Loader2, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CalendarSyncIndicator, type SyncStatus } from './CalendarSyncIndicator'

interface CalendarConnectionStatusProps {
  /** Whether the calendar is connected */
  isConnected: boolean
  /** Connected calendar email */
  calendarEmail?: string | null
  /** Last sync timestamp (ISO string) */
  lastSyncAt?: string | null
  /** Current sync status */
  syncStatus?: SyncStatus
  /** Callback when disconnect is confirmed */
  onDisconnect?: () => void | Promise<void>
  /** Callback when sync is requested */
  onSync?: () => void | Promise<void>
  /** Custom class name */
  className?: string
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return date.toLocaleDateString()
}

/**
 * CalendarConnectionStatus Component
 * 
 * Displays the current calendar connection status including:
 * - Connected/disconnected state
 * - Connected calendar email
 * - Last sync time
 * - Disconnect button with confirmation
 */
export function CalendarConnectionStatus({
  isConnected,
  calendarEmail,
  lastSyncAt,
  syncStatus = 'synced',
  onDisconnect,
  onSync,
  className,
}: CalendarConnectionStatusProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    setDisconnectError(null)

    try {
      const response = await fetch('/api/mentor/calendar/disconnect', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect calendar')
      }

      // Call optional callback
      await onDisconnect?.()
    } catch (err) {
      setDisconnectError(
        err instanceof Error ? err.message : 'Failed to disconnect calendar'
      )
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-3 pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">No Calendar Connected</p>
            <p className="text-muted-foreground text-xs">
              Connect your Google Calendar to sync availability
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              Google Calendar
            </CardTitle>
            <CardDescription className="mt-1">
              {calendarEmail || 'Calendar connected'}
            </CardDescription>
          </div>
          <CalendarSyncIndicator
            status={syncStatus}
            lastSyncAt={lastSyncAt}
            onSync={onSync}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection info */}
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Connected</span>
          {lastSyncAt && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                Last synced {formatRelativeTime(lastSyncAt)}
              </span>
            </>
          )}
        </div>

        {/* Error message */}
        {disconnectError && (
          <p className="text-sm text-destructive">{disconnectError}</p>
        )}

        {/* Disconnect button with confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-destructive"
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Unlink className="h-4 w-4" />
                  Disconnect Calendar
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the calendar connection and stop syncing your
                availability. Your existing availability settings will remain,
                but won&apos;t automatically reflect your calendar busy times.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                variant="destructive"
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
