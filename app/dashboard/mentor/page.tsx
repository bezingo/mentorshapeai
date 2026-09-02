import { getCurrentProfile, requireMentor } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Package, Users, ExternalLink, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function MentorDashboardPage() {
  // Require mentor role - redirect to dashboard if not a mentor
  const profile = await requireMentor({ redirectTo: '/dashboard' })

  // Fetch mentor stats
  const supabase = createServiceClient()
  
  // Get availability count
  const { count: availabilityCount } = await supabase
    .from('mentor_availability')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .eq('is_active', true)

  // Get offers count
  const { count: offersCount } = await supabase
    .from('mentor_offers')
    .select('*', { count: 'exact', head: true })
    .eq('mentor_profile_id', profile.id)
    .eq('is_active', true)

  // Get calendar connection status
  const { data: calendarConnection } = await supabase
    .from('calendar_connections')
    .select('id, last_sync_at')
    .eq('profile_id', profile.id)
    .single()

  const hasCalendarConnected = !!calendarConnection

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mentor Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your availability, offerings, and help mentees achieve their goals.
          </p>
        </div>
        {profile.public_handle && (
          <Button asChild variant="outline">
            <Link href={`/m/${profile.public_handle}`} target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Profile
            </Link>
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Availability Slots</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availabilityCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {availabilityCount === 0 ? 'No slots configured' : 'Active weekly slots'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Offers</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offersCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {offersCount === 0 ? 'No offers created' : 'Consultation offerings'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calendar</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasCalendarConnected ? 'Connected' : 'Not Connected'}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasCalendarConnected 
                ? `Last synced: ${calendarConnection.last_sync_at ? new Date(calendarConnection.last_sync_at).toLocaleDateString() : 'Never'}`
                : 'Connect to sync busy times'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Availability Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Availability
            </CardTitle>
            <CardDescription>
              Set your weekly availability for mentees to book focus sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availabilityCount === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  You haven&apos;t set up your availability yet. Define your weekly schedule so mentees can book time with you.
                </p>
                <Button asChild>
                  <Link href="/dashboard/mentor/availability">
                    Set Up Availability
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  You have {availabilityCount} active time slot{availabilityCount !== 1 ? 's' : ''} configured.
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/mentor/availability">
                    Manage
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offers Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Consultation Offers
            </CardTitle>
            <CardDescription>
              Define what you offer to mentees - free collaborations or paid consultations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {offersCount === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Create consultation offerings to let mentees know what you can help them with.
                </p>
                <Button asChild>
                  <Link href="/dashboard/mentor/offers">
                    Create Offers
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  You have {offersCount} active offer{offersCount !== 1 ? 's' : ''}.
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/mentor/offers">
                    Manage
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collaborations Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Collaborations
            </CardTitle>
            <CardDescription>
              View and manage your active mentoring relationships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                View your active and pending collaborations.
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/collaborations">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Connection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar Integration
            </CardTitle>
            <CardDescription>
              Connect your Google Calendar to automatically sync busy times.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCalendarConnected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Calendar connected</span>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/mentor/availability">
                    Manage
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Connect your calendar to automatically block busy times from your availability.
                </p>
                <Button asChild variant="outline">
                  <Link href="/dashboard/mentor/availability">
                    Connect Calendar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

