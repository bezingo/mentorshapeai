'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { format, isPast, isFuture, differenceInMinutes } from 'date-fns'
import {
  Calendar,
  Clock,
  Video,
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  User,
  Target,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { FocusAgendaView, type FocusAgenda } from '@/components/focuses/FocusAgendaView'
import { FocusSummaryView, type FocusSummary } from '@/components/focuses/FocusSummaryView'
import { cn } from '@/lib/utils'
import type { FocusStatus } from '@/lib/validations/focus'

interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  handle: string | null
  timezone: string | null
}

interface Goal {
  id: string
  title: string
  description: string | null
  category: string | null
}

interface Collaboration {
  id: string
  mentor_profile_id: string
  mentee_profile_id: string
  status: string
  goal: Goal | null
  mentor_profile: Profile | null
  mentee_profile: Profile | null
}

interface Focus {
  id: string
  collaboration_id: string
  scheduled_at: string
  duration_minutes: number
  status: FocusStatus
  meeting_url: string | null
  meeting_id: string | null
  meeting_provider: string | null
  cancelled_at: string | null
  completed_at: string | null
  cancelled_by: string | null
  collaboration: Collaboration
  cancelled_by_profile?: {
    id: string
    display_name: string
  } | null
  agenda: FocusAgenda | null
  summary: FocusSummary | null
  user_role: 'mentor' | 'mentee'
}

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Get status display info
 */
function getStatusInfo(status: FocusStatus) {
  switch (status) {
    case 'scheduled':
      return { label: 'Scheduled', color: 'bg-blue-500', variant: 'outline' as const }
    case 'in_progress':
      return { label: 'In Progress', color: 'bg-green-500', variant: 'default' as const }
    case 'completed':
      return { label: 'Completed', color: 'bg-gray-500', variant: 'secondary' as const }
    case 'cancelled':
      return { label: 'Cancelled', color: 'bg-red-500', variant: 'destructive' as const }
    case 'no_show':
      return { label: 'No Show', color: 'bg-orange-500', variant: 'destructive' as const }
    default:
      return { label: status, color: 'bg-gray-500', variant: 'outline' as const }
  }
}

export default function FocusDetailPage({ params }: PageProps) {
  const { id: focusId } = use(params)

  // State
  const [focus, setFocus] = useState<Focus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isGeneratingAgenda, setIsGeneratingAgenda] = useState(false)

  // Fetch focus details
  useEffect(() => {
    async function fetchFocus() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/focuses/${focusId}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to fetch focus')
        }

        setFocus(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFocus()
  }, [focusId])

  // Handle cancel
  const handleCancel = async () => {
    if (!focus) return

    setIsCancelling(true)
    try {
      const response = await fetch(`/api/focuses/${focusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to cancel focus')
      }

      setFocus({ ...focus, ...result.data })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setIsCancelling(false)
    }
  }

  // Handle generate agenda
  const handleGenerateAgenda = async () => {
    if (!focus) return

    setIsGeneratingAgenda(true)
    try {
      const response = await fetch(`/api/focuses/${focusId}/agenda/generate`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate agenda')
      }

      // Refresh focus to get new agenda
      const focusResponse = await fetch(`/api/focuses/${focusId}`)
      const focusResult = await focusResponse.json()
      if (focusResponse.ok) {
        setFocus(focusResult.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate agenda')
    } finally {
      setIsGeneratingAgenda(false)
    }
  }

  // Handle update notes
  const handleUpdateNotes = async (notes: string) => {
    if (!focus) return

    const response = await fetch(`/api/focuses/${focusId}/agenda`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [focus.user_role === 'mentee' ? 'mentee_notes' : 'mentor_notes']: notes,
      }),
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error?.message || 'Failed to save notes')
    }
  }

  // Handle rate mood
  const handleRateMood = async (rating: number) => {
    if (!focus) return

    const response = await fetch(`/api/focuses/${focusId}/summary`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood_rating: rating }),
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error?.message || 'Failed to save rating')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !focus) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error || 'Focus not found'}</span>
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

  const scheduledDate = new Date(focus.scheduled_at)
  const statusInfo = getStatusInfo(focus.status)
  const isPastFocus = isPast(scheduledDate)
  const isUpcoming = isFuture(scheduledDate) && focus.status === 'scheduled'
  const minutesUntilStart = differenceInMinutes(scheduledDate, new Date())
  const canJoin = focus.meeting_url && (
    focus.status === 'in_progress' ||
    (focus.status === 'scheduled' && minutesUntilStart <= 15 && minutesUntilStart >= -focus.duration_minutes)
  )
  const canCancel = focus.status === 'scheduled' && minutesUntilStart > 30

  const mentor = focus.collaboration.mentor_profile
  const mentee = focus.collaboration.mentee_profile
  const otherParty = focus.user_role === 'mentor' ? mentee : mentor

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/dashboard/collaborations/${focus.collaboration_id}/focuses`}
          className="hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Back to Sessions
        </Link>
      </div>

      {/* Main Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <CardTitle>Focus Session</CardTitle>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
              {focus.collaboration.goal && (
                <p className="text-muted-foreground flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {focus.collaboration.goal.title}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {canJoin && focus.meeting_url && (
                <a href={focus.meeting_url} target="_blank" rel="noopener noreferrer">
                  <Button className="gap-2">
                    <Video className="h-4 w-4" />
                    Join Meeting
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              )}
              {canCancel && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon" disabled={isCancelling}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel the scheduled focus session. The other party will be notified.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Session</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel}>
                        Cancel Session
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date/Time */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-medium">{format(scheduledDate, 'EEEE, MMMM d, yyyy')}</div>
                <div className="text-sm text-muted-foreground">
                  {format(scheduledDate, 'h:mm a')} ({focus.duration_minutes} min)
                </div>
              </div>
            </div>

            {isUpcoming && minutesUntilStart > 0 && (
              <Badge variant="outline" className="ml-auto">
                <Clock className="h-3 w-3 mr-1" />
                Starts in {minutesUntilStart < 60
                  ? `${minutesUntilStart} min`
                  : `${Math.floor(minutesUntilStart / 60)}h ${minutesUntilStart % 60}m`
                }
              </Badge>
            )}
          </div>

          {/* Participants */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Mentor */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarImage src={mentor?.avatar_url || undefined} />
                <AvatarFallback>
                  {mentor?.display_name?.charAt(0) || 'M'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {mentor?.display_name || 'Mentor'}
                </div>
                <div className="text-xs text-muted-foreground">Mentor</div>
              </div>
              {focus.user_role === 'mentee' && (
                <Badge variant="secondary" className="shrink-0">You</Badge>
              )}
            </div>

            {/* Mentee */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarImage src={mentee?.avatar_url || undefined} />
                <AvatarFallback>
                  {mentee?.display_name?.charAt(0) || 'M'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {mentee?.display_name || 'Mentee'}
                </div>
                <div className="text-xs text-muted-foreground">Mentee</div>
              </div>
              {focus.user_role === 'mentor' && (
                <Badge variant="secondary" className="shrink-0">You</Badge>
              )}
            </div>
          </div>

          {/* Meeting Info */}
          {focus.meeting_url && (
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Video className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {focus.meeting_provider
                    ? focus.meeting_provider.charAt(0).toUpperCase() + focus.meeting_provider.slice(1)
                    : 'Video'} Meeting
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {focus.meeting_url}
                </div>
              </div>
              <a href={focus.meeting_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          )}

          {/* Cancellation info */}
          {focus.status === 'cancelled' && focus.cancelled_by_profile && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">
                Cancelled by {focus.cancelled_by_profile.display_name}
                {focus.cancelled_at && (
                  <> on {format(new Date(focus.cancelled_at), 'MMM d, yyyy')}</>
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Agenda and Summary */}
      <Tabs defaultValue="agenda" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agenda" className="gap-2">
            Agenda
            {focus.agenda && <Badge variant="secondary" className="h-5 px-1.5">1</Badge>}
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            Summary
            {focus.summary && <Badge variant="secondary" className="h-5 px-1.5">1</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="space-y-4">
          {/* Generate Agenda Button */}
          {!focus.agenda && focus.status === 'scheduled' && (
            <Button
              variant="outline"
              onClick={handleGenerateAgenda}
              disabled={isGeneratingAgenda}
              className="w-full"
            >
              {isGeneratingAgenda ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Agenda...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate AI Agenda
                </>
              )}
            </Button>
          )}

          <FocusAgendaView
            agenda={focus.agenda}
            userRole={focus.user_role}
            onUpdateNotes={focus.agenda ? handleUpdateNotes : undefined}
          />
        </TabsContent>

        <TabsContent value="summary">
          <FocusSummaryView
            summary={focus.summary}
            userRole={focus.user_role}
            onRateMood={
              focus.user_role === 'mentee' && focus.summary && !focus.summary.mood_rating
                ? handleRateMood
                : undefined
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
