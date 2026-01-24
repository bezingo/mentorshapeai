'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type SyncStatus = 'syncing' | 'synced' | 'error'

interface CalendarSyncIndicatorProps {
  /** Current sync status */
  status: SyncStatus
  /** Last sync timestamp (ISO string) */
  lastSyncAt?: string | null
  /** Error message if status is 'error' */
  errorMessage?: string | null
  /** Callback when "Sync Now" is clicked */
  onSync?: () => void | Promise<void>
  /** Custom class name */
  className?: string
}

/**
 * Format relative time for tooltip display
 */
function formatLastSync(dateString: string | null | undefined): string {
  if (!dateString) return 'Never synced'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) return 'Synced just now'
  if (diffMins < 60) return `Synced ${diffMins}m ago`
  if (diffHours < 24) return `Synced ${diffHours}h ago`

  return `Synced ${date.toLocaleDateString()}`
}

/**
 * Get badge variant and content based on sync status
 */
function getStatusConfig(status: SyncStatus) {
  switch (status) {
    case 'syncing':
      return {
        variant: 'secondary' as const,
        icon: Loader2,
        iconClassName: 'animate-spin',
        label: 'Syncing',
      }
    case 'synced':
      return {
        variant: 'outline' as const,
        icon: Check,
        iconClassName: 'text-green-600 dark:text-green-400',
        label: 'Synced',
      }
    case 'error':
      return {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        iconClassName: '',
        label: 'Error',
      }
  }
}

/**
 * CalendarSyncIndicator Component
 * 
 * A compact badge/indicator showing calendar sync status:
 * - Syncing: spinning icon with "Syncing" label
 * - Synced: green checkmark with "Synced" label
 * - Error: warning icon with "Error" label
 * 
 * Includes tooltip with last sync time and "Sync Now" button.
 */
export function CalendarSyncIndicator({
  status,
  lastSyncAt,
  errorMessage,
  onSync,
  className,
}: CalendarSyncIndicatorProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const config = getStatusConfig(status)
  const Icon = config.icon

  const handleSync = async () => {
    if (isSyncing || status === 'syncing') return

    setIsSyncing(true)
    try {
      const response = await fetch('/api/mentor/calendar/sync', {
        method: 'POST',
      })

      if (!response.ok) {
        console.error('Sync failed')
      }

      // Call optional callback
      await onSync?.()
    } catch (err) {
      console.error('Sync error:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const isCurrentlySyncing = isSyncing || status === 'syncing'

  // Tooltip content
  const tooltipContent = (
    <div className="space-y-2">
      <p>{formatLastSync(lastSyncAt)}</p>
      {status === 'error' && errorMessage && (
        <p className="text-destructive">{errorMessage}</p>
      )}
      {!isCurrentlySyncing && (
        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={handleSync}
          className="w-full gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Sync Now
        </Button>
      )}
    </div>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={config.variant}
          className={className}
        >
          <Icon
            data-icon="inline-start"
            className={`h-3 w-3 ${config.iconClassName}`}
          />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="w-40">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  )
}
