import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAuth, getCurrentProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Target,
  Calendar,
  TrendingUp,
  ListTodo,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { ProgressScoreCard, type ProgressScore } from '@/components/progress/ProgressScoreCard'
import { MilestoneTracker, type Milestone } from '@/components/progress/MilestoneTracker'
import { ActionItemsList, type ActionItem } from '@/components/progress/ActionItemsList'
import { ProgressTimeline, buildProgressTimeline } from '@/components/progress/ProgressTimeline'
import { getCurrentWeekStart } from '@/lib/validations/check-ins'
import { ProgressActions } from './progress-actions'

interface ProgressDashboardPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProgressDashboardPageProps) {
  return {
    title: 'Progress | MentorShape',
    description: 'Track your mentorship progress',
  }
}

async function ProgressDashboardContent({ id }: { id: string }) {
  await requireAuth()
  const profile = await getCurrentProfile()

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please complete your profile to view progress.</p>
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
        milestones
      ),
      mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
        id,
        display_name,
        avatar_url
      ),
      mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
        id,
        display_name,
        avatar_url
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

  // Fetch progress scores
  const { data: progressScores } = await supabase
    .from('progress_scores')
    .select('*')
    .eq('collaboration_id', id)
    .order('generated_at', { ascending: false })
    .limit(10)

  // Get latest score with previous score for trend
  const latestScore = progressScores?.[0]
  const previousScore = progressScores?.[1]

  const progressScore: ProgressScore | null = latestScore
    ? {
        id: latestScore.id,
        score: latestScore.score,
        trend: latestScore.trend as 'up' | 'down' | 'stable',
        previousScore: previousScore?.score ?? null,
        recommendations: latestScore.recommendations,
        generatedAt: latestScore.generated_at,
      }
    : null

  // Fetch action items
  const { data: actionItemsData } = await supabase
    .from('action_items')
    .select(`
      *,
      assignee:profiles!action_items_assignee_profile_id_fkey(
        id,
        display_name
      )
    `)
    .eq('collaboration_id', id)
    .order('due_date', { ascending: true })

  const actionItems: ActionItem[] = (actionItemsData || []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    dueDate: item.due_date,
    assigneeId: item.assignee_profile_id,
    assigneeName: item.assignee?.display_name,
    completedAt: item.completed_at,
    createdAt: item.created_at,
  }))

  // Fetch check-ins
  const { data: checkInsData } = await supabase
    .from('check_ins')
    .select('*')
    .eq('collaboration_id', id)
    .order('week_start', { ascending: false })
    .limit(10)

  // Check if current week check-in exists (by current user)
  const currentWeekStart = getCurrentWeekStart()
  const existingCheckIn = checkInsData?.find(
    (ci) => ci.week_start === currentWeekStart && ci.profile_id === profile.id
  )

  // Fetch focuses for timeline
  const { data: focusesData } = await supabase
    .from('focuses')
    .select('id, scheduled_at, status, duration_minutes')
    .eq('collaboration_id', id)
    .order('scheduled_at', { ascending: false })
    .limit(20)

  // Build milestones from goal data
  const milestones: Milestone[] = collaboration.goal?.milestones
    ? (collaboration.goal.milestones as Array<{
        id: string
        title: string
        description?: string
        status?: string
        due_date?: string
        completed_at?: string
        order?: number
      }>).map((m, index) => ({
        id: m.id || `milestone-${index}`,
        title: m.title,
        description: m.description || null,
        status: (m.status as Milestone['status']) || 'pending',
        dueDate: m.due_date || null,
        completedAt: m.completed_at || null,
        order: m.order ?? index,
      }))
    : []

  // Build timeline events
  const timelineEvents = buildProgressTimeline({
    focuses: focusesData || [],
    checkIns: checkInsData || [],
    progressScores: progressScores || [],
    actionItems: actionItemsData?.filter((item) => item.status === 'completed') || [],
  })

  // Stats
  const completedFocuses = focusesData?.filter((f) => f.status === 'completed').length || 0
  const pendingActionItems = actionItems.filter((i) => i.status === 'pending').length
  const totalCheckIns = checkInsData?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Progress Dashboard
          </h2>
          {collaboration.goal && (
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Target className="h-4 w-4" />
              {collaboration.goal.title}
            </p>
          )}
        </div>

        <ProgressActions collaborationId={id} userRole={userRole} />
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Focus Sessions</p>
              <Calendar className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{completedFocuses}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Pending Tasks</p>
              <ListTodo className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{pendingActionItems}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Check-ins</p>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{totalCheckIns}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Progress Score</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-1">
              {progressScore ? `${progressScore.score}%` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Score, Milestones, Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Score Card */}
          <ProgressScoreCard score={progressScore} />

          {/* Milestones */}
          {milestones.length > 0 && (
            <MilestoneTracker milestones={milestones} />
          )}

          {/* Action Items */}
          <ActionItemsList
            items={actionItems}
            currentUserId={profile.id}
            showFilters={true}
          />
        </div>

        {/* Right column - Check-in, Timeline */}
        <div className="space-y-6">
          {/* Check-in status for mentees */}
          {isMentee && existingCheckIn && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  This Week&apos;s Check-in
                </CardTitle>
                <CardDescription>
                  Week of {format(new Date(existingCheckIn.week_start), 'MMMM d')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {existingCheckIn.mood_rating === 1 ? '😞' :
                     existingCheckIn.mood_rating === 2 ? '😕' :
                     existingCheckIn.mood_rating === 3 ? '😐' :
                     existingCheckIn.mood_rating === 4 ? '🙂' : '😄'}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {existingCheckIn.mood_rating === 1 ? 'Struggling' :
                       existingCheckIn.mood_rating === 2 ? 'Challenged' :
                       existingCheckIn.mood_rating === 3 ? 'Okay' :
                       existingCheckIn.mood_rating === 4 ? 'Good' : 'Great'}
                    </p>
                    <p className="text-xs text-muted-foreground">Mood rating: {existingCheckIn.mood_rating}/5</p>
                  </div>
                </div>
                {existingCheckIn.progress_notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Progress Notes</p>
                    <p className="text-sm text-muted-foreground">{existingCheckIn.progress_notes}</p>
                  </div>
                )}
                {existingCheckIn.wins && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Wins</p>
                    <p className="text-sm text-muted-foreground">{existingCheckIn.wins}</p>
                  </div>
                )}
                {existingCheckIn.blockers && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Blockers</p>
                    <p className="text-sm text-muted-foreground">{existingCheckIn.blockers}</p>
                  </div>
                )}
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Submitted {format(new Date(existingCheckIn.created_at), 'MMM d')}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Progress Timeline */}
          <ProgressTimeline events={timelineEvents} limit={10} />
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} size="sm">
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="py-8">
              <Skeleton className="h-32 w-32 mx-auto rounded-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="py-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default async function ProgressDashboardPage({ params }: ProgressDashboardPageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href={`/dashboard/collaborations/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Collaboration
      </Link>

      <Suspense fallback={<LoadingSkeleton />}>
        <ProgressDashboardContent id={id} />
      </Suspense>
    </div>
  )
}
