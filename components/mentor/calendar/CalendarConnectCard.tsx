'use client'

import { useState } from 'react'
import { Calendar, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * Google Calendar icon SVG component
 */
function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.316 6.168H5.684a.516.516 0 0 0-.516.516v11.632c0 .285.231.516.516.516h12.632a.516.516 0 0 0 .516-.516V6.684a.516.516 0 0 0-.516-.516Z"
        fill="#fff"
      />
      <path
        d="M18.316 5.168H5.684A1.516 1.516 0 0 0 4.168 6.684v11.632a1.516 1.516 0 0 0 1.516 1.516h12.632a1.516 1.516 0 0 0 1.516-1.516V6.684a1.516 1.516 0 0 0-1.516-1.516Z"
        stroke="#4285F4"
        strokeWidth="1"
        fill="none"
      />
      <path d="M7.5 10.5h2v2h-2v-2Z" fill="#EA4335" />
      <path d="M11 10.5h2v2h-2v-2Z" fill="#FBBC04" />
      <path d="M14.5 10.5h2v2h-2v-2Z" fill="#34A853" />
      <path d="M7.5 14h2v2h-2v-2Z" fill="#4285F4" />
      <path d="M11 14h2v2h-2v-2Z" fill="#EA4335" />
      <path d="M14.5 14h2v2h-2v-2Z" fill="#FBBC04" />
    </svg>
  )
}

/**
 * Benefits of connecting Google Calendar
 */
const BENEFITS = [
  'Automatically block times when you\'re busy',
  'Sync your availability in real-time',
  'Prevent double-bookings',
]

interface CalendarConnectCardProps {
  /** Whether the calendar is already connected */
  isConnected?: boolean
  /** Callback when connection is initiated */
  onConnect?: () => void
  /** Custom class name */
  className?: string
}

/**
 * CalendarConnectCard Component
 * 
 * Displays a card with Google Calendar OAuth connect button,
 * showing benefits of connecting and handling the auth flow.
 */
export function CalendarConnectCard({
  isConnected = false,
  onConnect,
  className,
}: CalendarConnectCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/mentor/calendar/auth-url')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get authorization URL')
      }

      if (data.data?.auth_url) {
        // Call optional callback before redirect
        onConnect?.()
        // Redirect to Google OAuth
        window.location.href = data.data.auth_url
      } else {
        throw new Error('No authorization URL returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect calendar')
      setIsLoading(false)
    }
  }

  if (isConnected) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-3 pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-sm">Calendar Connected</p>
            <p className="text-muted-foreground text-xs">
              Your Google Calendar is synced
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GoogleCalendarIcon className="h-5 w-5" />
          Connect Google Calendar
        </CardTitle>
        <CardDescription>
          Sync your calendar to automatically manage your availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Benefits list */}
        <ul className="space-y-2">
          {BENEFITS.map((benefit, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{benefit}</span>
            </li>
          ))}
        </ul>

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Connect button */}
        <Button
          type="button"
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <GoogleCalendarIcon className="h-4 w-4" />
              Connect Calendar
            </>
          )}
        </Button>

        {/* Privacy note */}
        <p className="text-xs text-muted-foreground text-center">
          We only read your busy/free status. No event details are stored.
        </p>
      </CardContent>
    </Card>
  )
}
