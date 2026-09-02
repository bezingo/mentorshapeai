import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAuth, getCurrentProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Target,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Hourglass,
  AlertCircle,
  MessageSquare,
  Video,
  ListTodo,
  TrendingUp,
  Play,
  ExternalLink,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  CollaborationTimeline,
  buildCollaborationTimeline,
  type TimelineEvent,
} from '@/components/collaborations/CollaborationTimeline'
import { type CollaborationStatus } from '@/lib/validations/collaboration'
import { CollaborationActions } from './collaboration-actions'

interface CollaborationDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CollaborationDetailPageProps) {
  const { id } = await params
  return {
    title: `Collaboration | MentorShape`,
    description: `View collaboration details`,
  }
}

/** Status badge configuration */
const statusConfig: Record<
  CollaborationStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType; color: string }
> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Hourglass, color: 'text-yellow-600' },
  accepted: { label: 'Accepted', variant: 'default', icon: CheckCircle2, color: 'text-green-600' },
  active: { label: 'Active', variant: 'default', icon: Play, color: 'text-primary' },
  completed: { label: 'Completed', variant: 'outline', icon: CheckCircle2, color: 'text-green-600' },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle, color: 'text-red-600' },
  declined: { label: 'Declined', variant: 'destructive', icon: AlertCircle, color: 'text-red-600' },
}

/** Get initials from display name */
function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

async function CollaborationDetailContent({ id }: { id: string }) {
  await requireAuth()
  const profile = await getCurrentProfile()

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please complete your profile to view this collaboration.</p>
        </CardContent>
      </Card>
    )
  }

  const supabase = createServiceClient()

  // Fetch collaboration with related data
  const { data: collaboration, error } = await supabase
    .from('collaborations')
    .select(`
      *,
      goal:goals!collaborations_goal_id_fkey(
        id,
        title,
        description,
        status,
        category,
        success_definition,
        current_challenges,
        motivation,
        duration_days,
        created_at
      ),
      mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
        id,
        display_name,
        avatar_url,
        handle,
        bio,
        timezone
      ),
      mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
        id,
        display_name,
        avatar_url,
        handle,
        bio,
        timezone
      ),
      offer:mentor_offers!collaborations_offer_id_fkey(
        id,
        title,
        type,
        description,
        duration_minutes,
        price_cents,
        currency
      ),
      cancelled_by_profile:profiles!collaborations_cancelled_by_fkey(
        id,
        display_name
      )
    `)
    .eq('id', id)
    .single()

  if (error || !collaboration) {
    console.error('Error fetching collaboration:', error)
    notFound()
  }

  // Verify access
  const isMentor = collaboration.mentor_profile_id === profile.id
  const isMentee = collaboration.mentee_profile_id === profile.id

  if (!isMentor && !isMentee) {
    notFound()
  }

  const userRole = isMentor ? 'mentor' : 'mentee'
  const otherPerson = isMentor ? collaboration.mentee_profile : collaboration.mentor_profile
  const otherRole = isMentor ? 'Mentee' : 'Mentor'

  // Fetch related data for active collaborations
  let focuses: Array<{ id: string; scheduled_at: string; status: string; duration_minutes: number }> = []
  let actionItems: Array<{ id: string; title: string; status: string; due_date: string | null }> = []
  let progressScore: { score: number; trend: string } | null = null

  if (collaboration.status === 'active' || collaboration.status === 'accepted') {
    // Fetch focuses
    const { data: focusData } = await supabase
      .from('focuses')
      .select('id, scheduled_at, status, duration_minutes')
      .eq('collaboration_id', id)
      .order('scheduled_at', { ascending: false })
      .limit(5)
    focuses = focusData || []

    // Fetch action items
    const { data: itemsData } = await supabase
      .from('action_items')
      .select('id, title, status, due_date')
      .eq('collaboration_id', id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(5)
    actionItems = itemsData || []

    // Fetch latest progress score
    const { data: scoreData } = await supabase
      .from('progress_scores')
      .select('score, trend')
      .eq('collaboration_id', id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()
    progressScore = scoreData
  }

  const statusInfo = statusConfig[collaboration.status as CollaborationStatus]
  const StatusIcon = statusInfo.icon

  // Build timeline events
  const timelineEvents = buildCollaborationTimeline(collaboration)

  // Add focus events to timeline
  focuses.forEach((focus) => {
    timelineEvents.push({
      id: focus.id,
      type: 'focus',
      title: focus.status === 'completed' ? 'Focus session completed' : 'Focus session scheduled',
      timestamp: focus.scheduled_at,
      metadata: { scheduled_at: focus.scheduled_at },
    })
  })

  // Sort by timestamp
  timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            {otherPerson?.avatar_url && (
              <AvatarImage src={otherPerson.avatar_url} alt={otherPerson.display_name || ''} />
            )}
            <AvatarFallback className="text-lg">{getInitials(otherPerson?.display_name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{otherPerson?.display_name || 'Unknown User'}</h2>
              <Badge variant={statusInfo.variant}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              {otherRole}
              {otherPerson?.handle && <span className="text-muted-foreground/70">@{otherPerson.handle}</span>}
            </p>
          </div>
        </div>

        {/* Actions */}
        <CollaborationActions
          collaborationId={id}
          status={collaboration.status}
          userRole={userRole}
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Goal card */}
          {collaboration.goal && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{collaboration.goal.title}</CardTitle>
                      {collaboration.goal.category && (
                        <Badge variant="outline" className="mt-1">
                          {collaboration.goal.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isMentee && (
                    <Link href={`/dashboard/mentee/goals/${collaboration.goal.id}`}>
                      <Button variant="ghost" size="sm">
                        View Goal
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {collaboration.goal.description && (
                  <p className="text-sm text-muted-foreground">{collaboration.goal.description}</p>
                )}

                {collaboration.goal.success_definition && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Success Definition</p>
                    <p className="text-sm">{collaboration.goal.success_definition}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {collaboration.goal.duration_days && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {collaboration.goal.duration_days} days
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Created {format(new Date(collaboration.goal.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          {(collaboration.request_message || collaboration.response_message) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {collaboration.request_message && (
                  <div className="bg-primary/5 rounded-lg p-3 border-l-2 border-primary">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      From {collaboration.mentee_profile?.display_name || 'Mentee'}:
                    </p>
                    <p className="text-sm">{collaboration.request_message}</p>
                  </div>
                )}
                {collaboration.response_message && (
                  <div className="bg-muted/50 rounded-lg p-3 border-l-2 border-muted-foreground/30">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      From {collaboration.mentor_profile?.display_name || 'Mentor'}:
                    </p>
                    <p className="text-sm">{collaboration.response_message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Offer details */}
          {collaboration.offer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Offer Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{collaboration.offer.title}</p>
                  {collaboration.offer.description && (
                    <p className="text-sm text-muted-foreground">{collaboration.offer.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    {collaboration.offer.duration_minutes && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {collaboration.offer.duration_minutes} min
                      </span>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {collaboration.offer.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick stats for active collaborations */}
          {(collaboration.status === 'active' || collaboration.status === 'accepted') && (
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Focuses */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Video className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{focuses.length}</p>
                      <p className="text-sm text-muted-foreground">Focus Sessions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Items */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <ListTodo className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{actionItems.length}</p>
                      <p className="text-sm text-muted-foreground">Pending Tasks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {progressScore ? `${progressScore.score}%` : '—'}
                      </p>
                      <p className="text-sm text-muted-foreground">Progress Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right column - Timeline & info */}
        <div className="space-y-6">
          {/* Collaboration info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusInfo.variant}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Your Role</span>
                <Badge variant="outline" className="capitalize">{userRole}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Requested</span>
                <span>{format(new Date(collaboration.created_at), 'MMM d, yyyy')}</span>
              </div>
              {collaboration.started_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span>{format(new Date(collaboration.started_at), 'MMM d, yyyy')}</span>
                </div>
              )}
              {collaboration.completed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{format(new Date(collaboration.completed_at), 'MMM d, yyyy')}</span>
                </div>
              )}
              {collaboration.cancelled_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cancelled</span>
                  <span>{format(new Date(collaboration.cancelled_at), 'MMM d, yyyy')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
              <CardDescription>Activity history for this collaboration</CardDescription>
            </CardHeader>
            <CardContent>
              <CollaborationTimeline events={timelineEvents.slice(0, 10)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default async function CollaborationDetailPage({ params }: CollaborationDetailPageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/dashboard/collaborations" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Collaborations
      </Link>

      <Suspense fallback={<LoadingSkeleton />}>
        <CollaborationDetailContent id={id} />
      </Suspense>
    </div>
  )
}
