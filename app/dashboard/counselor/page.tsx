'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  UserPlus,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  Download,
  TrendingUp,
  Shield,
  Loader2,
} from 'lucide-react'

interface DashboardData {
  organization: {
    id: string
    name: string
    logo_url: string | null
    is_school: boolean
  }
  stats: {
    total_members: number
    active_members: number
    pending_invites: number
    mentors: number
    mentees: number
    active_collaborations: number
    upcoming_focuses: number
    recent_no_shows: number
    overdue_action_items: number
    pending_reports: number
    consent_pending: number
  }
  members: Array<{
    id: string
    role: string
    status: string
    year_grade: string | null
    profile: {
      id: string
      display_name: string | null
      avatar_url: string | null
      consent_given: boolean
    } | null
  }>
  upcoming_focuses: Array<{
    id: string
    scheduled_at: string
    duration_minutes: number
    collaboration: {
      mentor: { display_name: string } | null
      mentee: { display_name: string } | null
    }
  }>
  no_shows: Array<{
    id: string
    scheduled_at: string
    collaboration: {
      mentor: { display_name: string } | null
      mentee: { display_name: string } | null
    }
  }>
  overdue_action_items: Array<{
    id: string
    title: string
    due_date: string
    assignee: { display_name: string } | null
    collaboration: { goal: { title: string } | null } | null
  }>
  pending_reports: Array<{
    id: string
    report_type: string
    description: string
    created_at: string
    reporter: { display_name: string } | null
  }>
}

export default function CounselorDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/counselor/dashboard')
        if (response.ok) {
          const json = await response.json()
          setData(json.data)
        } else {
          setError('Failed to load dashboard')
        }
      } catch {
        setError('Failed to load dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error || 'No data available'}</p>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{data.organization.name}</h1>
          <p className="text-muted-foreground">School Administration Dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/counselor/import">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/counselor/pairs/new">
              <UserPlus className="h-4 w-4 mr-2" />
              Create Pair
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.total_members}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.mentors} mentors, {data.stats.mentees} mentees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Collaborations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.active_collaborations}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.upcoming_focuses} upcoming focuses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.pending_invites}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.consent_pending} awaiting consent
            </p>
          </CardContent>
        </Card>

        <Card className={data.stats.pending_reports > 0 ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safeguarding</CardTitle>
            <Shield className={`h-4 w-4 ${data.stats.pending_reports > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.pending_reports}</div>
            <p className="text-xs text-muted-foreground">
              pending reports
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Row */}
      {(data.stats.recent_no_shows > 0 || data.stats.overdue_action_items > 0 || data.stats.pending_reports > 0) && (
        <div className="flex gap-2 flex-wrap">
          {data.stats.recent_no_shows > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {data.stats.recent_no_shows} no-shows this week
            </Badge>
          )}
          {data.stats.overdue_action_items > 0 && (
            <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              <Clock className="h-3 w-3" />
              {data.stats.overdue_action_items} overdue tasks
            </Badge>
          )}
          {data.stats.pending_reports > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Shield className="h-3 w-3" />
              {data.stats.pending_reports} reports need review
            </Badge>
          )}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="focuses">Focuses</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Upcoming Focuses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Focuses</CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {data.upcoming_focuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming focuses</p>
                ) : (
                  <div className="space-y-3">
                    {data.upcoming_focuses.slice(0, 5).map((focus) => {
                      const collab = Array.isArray(focus.collaboration) ? focus.collaboration[0] : focus.collaboration
                      const mentor = collab?.mentor ? (Array.isArray(collab.mentor) ? collab.mentor[0] : collab.mentor) : null
                      const mentee = collab?.mentee ? (Array.isArray(collab.mentee) ? collab.mentee[0] : collab.mentee) : null
                      return (
                        <div key={focus.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {mentee?.display_name || 'Mentee'} & {mentor?.display_name || 'Mentor'}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(focus.scheduled_at)}</p>
                          </div>
                          <Badge variant="outline">{focus.duration_minutes}min</Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overdue Action Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overdue Tasks</CardTitle>
                <CardDescription>Action items past due date</CardDescription>
              </CardHeader>
              <CardContent>
                {data.overdue_action_items.length === 0 ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    All tasks on track
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.overdue_action_items.slice(0, 5).map((item) => {
                      const assignee = Array.isArray(item.assignee) ? item.assignee[0] : item.assignee
                      return (
                        <div key={item.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {assignee?.display_name || 'Unknown'} • Due {item.due_date}
                            </p>
                          </div>
                          <Badge variant="destructive">Overdue</Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <Button variant="outline" asChild>
                <Link href="/dashboard/counselor/members">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Members
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/counselor/pairs">
                  <UserPlus className="h-4 w-4 mr-2" />
                  View Pairs
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/counselor/reports/term">
                  <FileText className="h-4 w-4 mr-2" />
                  Term Report
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/api/counselor/csv-import">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>
                {data.stats.mentors} mentors, {data.stats.mentees} mentees, {data.stats.pending_invites} pending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.members.slice(0, 20).map((member) => {
                  const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile
                  return (
                    <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {profile?.display_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {profile?.display_name || 'Pending Invite'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.year_grade || member.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={member.role === 'admin' ? 'default' : member.role === 'mentor' ? 'secondary' : 'outline'}>
                          {member.role}
                        </Badge>
                        {member.status === 'pending' && (
                          <Badge variant="outline" className="text-amber-600">Pending</Badge>
                        )}
                        {profile && !profile.consent_given && (
                          <Badge variant="outline" className="text-red-600">No Consent</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/dashboard/counselor/members">View All Members</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="focuses" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming</CardTitle>
              </CardHeader>
              <CardContent>
                {data.upcoming_focuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming focuses</p>
                ) : (
                  <div className="space-y-3">
                    {data.upcoming_focuses.map((focus) => {
                      const collab = Array.isArray(focus.collaboration) ? focus.collaboration[0] : focus.collaboration
                      const mentor = collab?.mentor ? (Array.isArray(collab.mentor) ? collab.mentor[0] : collab.mentor) : null
                      const mentee = collab?.mentee ? (Array.isArray(collab.mentee) ? collab.mentee[0] : collab.mentee) : null
                      return (
                        <div key={focus.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">
                              {mentee?.display_name || 'Mentee'} & {mentor?.display_name || 'Mentor'}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(focus.scheduled_at)}</p>
                          </div>
                          <Badge variant="outline">
                            <Calendar className="h-3 w-3 mr-1" />
                            {focus.duration_minutes}min
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={data.no_shows.length > 0 ? 'border-red-200' : ''}>
              <CardHeader>
                <CardTitle>Recent No-Shows</CardTitle>
              </CardHeader>
              <CardContent>
                {data.no_shows.length === 0 ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    No recent no-shows
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.no_shows.map((focus) => {
                      const collab = Array.isArray(focus.collaboration) ? focus.collaboration[0] : focus.collaboration
                      const mentor = collab?.mentor ? (Array.isArray(collab.mentor) ? collab.mentor[0] : collab.mentor) : null
                      const mentee = collab?.mentee ? (Array.isArray(collab.mentee) ? collab.mentee[0] : collab.mentee) : null
                      return (
                        <div key={focus.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">
                              {mentee?.display_name || 'Mentee'} & {mentor?.display_name || 'Mentor'}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(focus.scheduled_at)}</p>
                          </div>
                          <Badge variant="destructive">No Show</Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Safeguarding Reports</CardTitle>
              <CardDescription>Reports that need your attention</CardDescription>
            </CardHeader>
            <CardContent>
              {data.pending_reports.length === 0 ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  No pending reports
                </p>
              ) : (
                <div className="space-y-4">
                  {data.pending_reports.map((report) => {
                    const reporter = Array.isArray(report.reporter) ? report.reporter[0] : report.reporter
                    return (
                      <div key={report.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="destructive">{report.report_type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(report.created_at)}
                              </span>
                            </div>
                            <p className="text-sm">{report.description.slice(0, 200)}...</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Reported by {reporter?.display_name || 'Unknown'}
                            </p>
                          </div>
                          <Button size="sm">Review</Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
