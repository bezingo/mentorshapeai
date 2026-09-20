'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Alert, Button } from '@heroui/react'
import { Bell } from 'lucide-react'

type RemindersPayload = {
  banner: string | null
  focuses: unknown[]
  collaborations: unknown[]
}

export function UpcomingRemindersBanner() {
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reminders/upcoming?within_days=14')
      if (!res.ok) {
        setMessage(null)
        return
      }
      const json = (await res.json()) as { data?: RemindersPayload }
      setMessage(json.data?.banner ?? null)
    } catch {
      setMessage(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading || !message) {
    return null
  }

  return (
    <Alert className="mx-3 mt-2 md:mx-4" status="accent">
      <Bell className="size-4 shrink-0" aria-hidden />
      <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
        <span className="text-small">{message}</span>
        <Link href="/dashboard/collaborations">
          <Button size="sm" variant="secondary">View collaborations</Button>
        </Link>
      </div>
    </Alert>
  )
}
