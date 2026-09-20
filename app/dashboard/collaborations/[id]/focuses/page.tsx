'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { format, isPast, isFuture } from 'date-fns'
import {
  Calendar,
  Clock,
  Video,
  ArrowLeft,
  Plus,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FocusBookingModal } from '@/components/focuses/FocusBookingModal'
import { StripePaymentModal } from '@/components/payments/stripe-payment-modal'
import { cn } from '@/lib/utils'
import type { FocusStatus } from '@/lib/validations/focus'

interface Focus {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: FocusStatus
  meeting_url: string | null
  meeting_provider: string | null
  cancelled_at: string | null
  completed_at: string | null
  cancelled_by_profile?: {
    id: string
    display_name: string
  } | null
}

interface Collaboration {
  id: string
  mentor_profile_id: string
  mentee_profile_id: string
  status: string
  mentor_profile?: {
    id: string
    display_name: string
    avatar_url: string | null
  }
  mentee_profile?: {
    id: string
    display_name: string
    avatar_url: string | null
  }
  goal?: {
    id: string
    title: string
  }
  offer_id?: string | null
  offer?: {
    id: string
    type: string
    title: string
    price_cents: number | null
    payment_required: boolean
  } | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Get status badge variant and icon
 */
function getStatusBadge(status: FocusStatus) {
  switch (status) {
    case 'scheduled':
      return {
        variant: 'outline' as const,
        icon: <Calendar className="h-3 w-3" />,
        label: 'Scheduled',
      }
    case 'pending_payment':
      return {
        variant: 'secondary' as const,
        icon: <Clock className="h-3 w-3" />,
        label: 'Awaiting payment',
      }
    case 'in_progress':
      return {
        variant: 'default' as const,
        icon: <Video className="h-3 w-3" />,
        label: 'In Progress',
      }
    case 'completed':
      return {
        variant: 'secondary' as const,
        icon: <CheckCircle2 className="h-3 w-3" />,
        label: 'Completed',
      }
    case 'cancelled':
      return {
        variant: 'destructive' as const,
        icon: <XCircle className="h-3 w-3" />,
        label: 'Cancelled',
      }
    case 'no_show':
      return {
        variant: 'destructive' as const,
        icon: <Ban className="h-3 w-3" />,
        label: 'No Show',
      }
    default:
      return {
        variant: 'outline' as const,
        icon: null,
        label: status,
      }
  }
}

export default function FocusesListPage({ params }: PageProps) {
  const { id: collaborationId } = use(params)

  // State
  const [collaboration, setCollaboration] = useState<Collaboration | null>(null)
  const [focuses, setFocuses] = useState<Focus[]>([])
  const [userRole, setUserRole] = useState<'mentor' | 'mentee'>('mentee')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null)
  const [paymentPublishableKey, setPaymentPublishableKey] = useState<string | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  // Fetch collaboration and focuses
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch collaboration details
        const collabResponse = await fetch(`/api/collaborations/${collaborationId}`)
        const collabResult = await collabResponse.json()

        if (!collabResponse.ok) {
          throw new Error(collabResult.error?.message || 'Failed to fetch collaboration')
        }

        setCollaboration(collabResult.data)
        setUserRole(collabResult.data.user_role || 'mentee')

        // Fetch focuses
        const focusResponse = await fetch(
          `/api/collaborations/${collaborationId}/focuses`
        )
        const focusResult = await focusResponse.json()

        if (!focusResponse.ok) {
          throw new Error(focusResult.error?.message || 'Failed to fetch focuses')
        }

        setFocuses(focusResult.data?.focuses || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [collaborationId])

  // Handle booking
  const refreshFocuses = async () => {
    const focusResponse = await fetch(
      `/api/collaborations/${collaborationId}/focuses`
    )
    const focusResult = await focusResponse.json()
    if (focusResponse.ok) {
      setFocuses(focusResult.data?.focuses || [])
    }
  }

  const handleBook = async (data: {
    scheduled_at: string
    duration_minutes: number
  }) => {
    const paidOffer =
      collaboration?.offer?.type === 'paid_consult' &&
      !collaboration.offer.payment_required
        ? collaboration.offer.id
        : undefined

    const response = await fetch(`/api/collaborations/${collaborationId}/focuses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        ...(paidOffer ? { mentor_offer_id: paidOffer } : {}),
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to book focus')
    }

    const payment = result.data?.payment as
      | { client_secret: string | null; publishable_key: string | null }
      | null
      | undefined

    if (payment?.client_secret && payment.publishable_key) {
      setPaymentClientSecret(payment.client_secret)
      setPaymentPublishableKey(payment.publishable_key)
      setIsPaymentModalOpen(true)
      return
    }

    await refreshFocuses()
  }

  // Separate focuses into upcoming and past
  const now = new Date()
  const upcomingFocuses = focuses.filter(
    (f) =>
      f.status === 'scheduled' &&
      isFuture(new Date(f.scheduled_at))
  )
  const inProgressFocuses = focuses.filter((f) => f.status === 'in_progress')
  const pastFocuses = focuses.filter(
    (f) =>
      f.status === 'completed' ||
      f.status === 'cancelled' ||
      f.status === 'no_show' ||
      (f.status === 'scheduled' && isPast(new Date(f.scheduled_at)))
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
        <Link href="/dashboard/collaborations">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Collaborations
          </Button>
        </Link>
      </div>
    )
  }

  const mentorName = collaboration?.mentor_profile?.display_name || 'Mentor'
  const canBookFocus = ['accepted', 'active'].includes(collaboration?.status || '')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/dashboard/collaborations/${collaborationId}`}
              className="hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 inline mr-1" />
              Back to Collaboration
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Focus Sessions</h1>
          {collaboration?.goal && (
            <p className="text-muted-foreground">
              For: {collaboration.goal.title}
            </p>
          )}
        </div>
        {canBookFocus && (
          <Button onClick={() => setIsBookingModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Book Session
          </Button>
        )}
      </div>

      {/* In Progress Sessions */}
      {inProgressFocuses.length > 0 && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Video className="h-5 w-5" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inProgressFocuses.map((focus) => (
                <FocusCard
                  key={focus.id}
                  focus={focus}
                  collaborationId={collaborationId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Sessions
            {upcomingFocuses.length > 0 && (
              <Badge variant="secondary">{upcomingFocuses.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingFocuses.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                No upcoming sessions
              </p>
              {canBookFocus && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsBookingModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Book Your First Session
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingFocuses.map((focus) => (
                <FocusCard
                  key={focus.id}
                  focus={focus}
                  collaborationId={collaborationId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Sessions */}
      {pastFocuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Past Sessions
              <Badge variant="outline">{pastFocuses.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastFocuses.map((focus) => (
                <FocusCard
                  key={focus.id}
                  focus={focus}
                  collaborationId={collaborationId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Modal */}
      {collaboration && (
        <FocusBookingModal
          open={isBookingModalOpen}
          onOpenChange={setIsBookingModalOpen}
          collaborationId={collaborationId}
          mentorProfileId={collaboration.mentor_profile_id}
          mentorName={mentorName}
          onBook={handleBook}
        />
      )}

      <StripePaymentModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        clientSecret={paymentClientSecret}
        publishableKey={paymentPublishableKey}
        title={
          collaboration?.offer?.title
            ? `Pay for ${collaboration.offer.title}`
            : 'Complete payment'
        }
        onSuccess={refreshFocuses}
      />
    </div>
  )
}

/**
 * Individual focus card component
 */
function FocusCard({
  focus,
  collaborationId,
}: {
  focus: Focus
  collaborationId: string
}) {
  const statusBadge = getStatusBadge(focus.status)
  const scheduledDate = new Date(focus.scheduled_at)
  const isPastSession = isPast(scheduledDate) && focus.status === 'scheduled'

  return (
    <Link href={`/focuses/${focus.id}`}>
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-muted/50',
          focus.status === 'cancelled' && 'opacity-60',
          isPastSession && 'opacity-60'
        )}
      >
        <div className="flex items-center gap-4">
          {/* Date/Time */}
          <div className="text-center min-w-[60px]">
            <div className="text-2xl font-bold">{format(scheduledDate, 'd')}</div>
            <div className="text-xs text-muted-foreground uppercase">
              {format(scheduledDate, 'MMM')}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {format(scheduledDate, 'EEEE')}
              </span>
              <Badge variant={statusBadge.variant} className="gap-1">
                {statusBadge.icon}
                {statusBadge.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(scheduledDate, 'h:mm a')}
              </span>
              <span>{focus.duration_minutes} min</span>
              {focus.meeting_provider && (
                <span className="flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  {focus.meeting_provider.charAt(0).toUpperCase() +
                    focus.meeting_provider.slice(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </Link>
  )
}
