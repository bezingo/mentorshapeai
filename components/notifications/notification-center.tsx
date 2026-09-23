'use client'

import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { NotificationRecord } from '@/lib/notifications/types'

async function fetchNotifications(): Promise<{
  data: NotificationRecord[]
  meta: { unread_count: number }
}> {
  const res = await fetch('/api/notifications?limit=20')
  if (!res.ok) {
    throw new Error('Failed to load notifications')
  }
  return res.json()
}

async function markAllRead(): Promise<void> {
  const res = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all: true }),
  })
  if (!res.ok) {
    throw new Error('Failed to mark notifications read')
  }
}

async function markOneRead(id: string): Promise<void> {
  const res = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: [id] }),
  })
  if (!res.ok) {
    throw new Error('Failed to mark notification read')
  }
}

export function NotificationCenter() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  })

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markOneMutation = useMutation({
    mutationFn: markOneRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications = data?.data ?? []
  const unreadCount = data?.meta.unread_count ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={unreadCount === 0 || markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            {markAllMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCheck className="h-3 w-3" />
            )}
            Mark all read
          </Button>
        </div>
        <DropdownMenuSeparator />
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}
        {isError && (
          <div className="space-y-2 px-2 py-4 text-center text-sm">
            <p className="text-muted-foreground">Could not load notifications.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !isError && notifications.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        )}
        {!isLoading &&
          !isError &&
          notifications.map((notification) => {
            const isUnread = !notification.read_at
            const content = (
              <div className="flex flex-col gap-0.5 text-left">
                <span className={cn('text-sm font-medium', isUnread && 'text-foreground')}>
                  {notification.title}
                </span>
                {notification.message && (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </div>
            )

            if (notification.action_url) {
              return (
                <DropdownMenuItem key={notification.id} asChild className="cursor-pointer p-3">
                  <Link
                    href={notification.action_url}
                    onClick={() => {
                      if (isUnread) {
                        markOneMutation.mutate(notification.id)
                      }
                    }}
                  >
                    {content}
                  </Link>
                </DropdownMenuItem>
              )
            }

            return (
              <DropdownMenuItem
                key={notification.id}
                className="cursor-pointer p-3"
                onClick={() => {
                  if (isUnread) {
                    markOneMutation.mutate(notification.id)
                  }
                }}
              >
                {content}
              </DropdownMenuItem>
            )
          })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center text-xs text-muted-foreground">
          <Link href="/dashboard/settings/notifications">Notification settings</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
