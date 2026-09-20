'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NOTIFICATION_TYPES } from '@/lib/notifications/types'

type PreferenceRow = {
  channel: string
  type: string
  enabled: boolean
}

const TYPE_LABELS: Record<string, string> = {
  collab_request: 'Collaboration requests',
  collab_accepted: 'Collaboration accepted',
  collab_declined: 'Collaboration declined',
  collab_cancelled: 'Collaboration cancelled',
  session_scheduled: 'Sessions scheduled / rescheduled',
  session_reminder: 'Session reminders',
  session_completed: 'Sessions completed',
  session_cancelled: 'Sessions cancelled',
  milestone_completed: 'Milestones completed',
  goal_completed: 'Goals completed',
  payment_success: 'Payment successful',
  payment_failed: 'Payment failed',
  match_proposed: 'Program matches proposed',
  system_update: 'Product updates',
}

async function fetchPreferences(): Promise<{ data: PreferenceRow[] }> {
  const res = await fetch('/api/notifications/preferences')
  if (!res.ok) throw new Error('Failed to load preferences')
  return res.json()
}

export default function NotificationSettingsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchPreferences,
  })

  const mutation = useMutation({
    mutationFn: async (payload: {
      channel: 'email' | 'in_app'
      type: string
      enabled: boolean
    }) => {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: [payload] }),
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })

  const preferences = data?.data ?? []

  function isEnabled(channel: 'email' | 'in_app', type: string): boolean {
    const row = preferences.find((p) => p.channel === channel && p.type === type)
    return row?.enabled ?? true
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/settings" aria-label="Back to settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Choose how you want to be notified about collaborations and focus sessions.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading preferences…
        </div>
      )}

      {isError && (
        <Card className="p-4 text-sm text-destructive">
          Could not load notification preferences. Please try again later.
        </Card>
      )}

      {!isLoading && !isError && (
        <Card className="divide-y">
          {NOTIFICATION_TYPES.map((type) => (
            <div key={type} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{TYPE_LABELS[type] ?? type}</p>
                <p className="text-xs text-muted-foreground">{type}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    id={`${type}-in-app`}
                    type="checkbox"
                    className="h-4 w-4 rounded border"
                    checked={isEnabled('in_app', type)}
                    disabled={mutation.isPending}
                    onChange={(e) =>
                      mutation.mutate({
                        channel: 'in_app',
                        type,
                        enabled: e.target.checked,
                      })
                    }
                  />
                  <Label htmlFor={`${type}-in-app`} className="text-sm font-normal">
                    In-app
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`${type}-email`}
                    type="checkbox"
                    className="h-4 w-4 rounded border"
                    checked={isEnabled('email', type)}
                    disabled={mutation.isPending}
                    onChange={(e) =>
                      mutation.mutate({
                        channel: 'email',
                        type,
                        enabled: e.target.checked,
                      })
                    }
                  />
                  <Label htmlFor={`${type}-email`} className="text-sm font-normal">
                    Email
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
