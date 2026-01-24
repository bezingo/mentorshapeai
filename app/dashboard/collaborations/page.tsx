import { Suspense } from 'react'
import { requireAuth, getCurrentProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Inbox, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { CollaborationCard, type Collaboration } from '@/components/collaborations/CollaborationCard'
import { MentorRequestsList } from '@/components/collaborations/MentorRequestsList'

export const metadata = {
  title: 'Collaborations | MentorShape',
  description: 'View and manage your mentoring collaborations',
}

async function CollaborationsContent() {
  await requireAuth()
  const profile = await getCurrentProfile()

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please complete your profile to view collaborations.</p>
        </CardContent>
      </Card>
    )
  }

  const supabase = createServiceClient()

  // Fetch all collaborations for this user
  const { data: collaborations, error } = await supabase
    .from('collaborations')
    .select(`
      *,
      goal:goals!collaborations_goal_id_fkey(
        id,
        title,
        description,
        status,
        category
      ),
      mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
        id,
        display_name,
        avatar_url,
        handle
      ),
      mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
        id,
        display_name,
        avatar_url,
        handle
      ),
      offer:mentor_offers!collaborations_offer_id_fkey(
        id,
        title,
        type,
        duration_minutes
      )
    `)
    .or(`mentor_profile_id.eq.${profile.id},mentee_profile_id.eq.${profile.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching collaborations:', error)
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load collaborations. Please try again.</p>
        </CardContent>
      </Card>
    )
  }

  // Process collaborations with user role
  const allCollaborations: Collaboration[] = (collaborations || []).map((collab) => ({
    ...collab,
    user_role: collab.mentor_profile_id === profile.id ? 'mentor' : 'mentee',
  }))

  // Separate by role
  const asMentor = allCollaborations.filter((c) => c.user_role === 'mentor')
  const asMentee = allCollaborations.filter((c) => c.user_role === 'mentee')
  const pendingRequests = asMentor.filter((c) => c.status === 'pending')
  const activeCollaborations = allCollaborations.filter(
    (c) => c.status === 'active' || c.status === 'accepted'
  )

  // Check if user is a mentor
  const isMentor = profile.is_mentor

  return (
    <Tabs defaultValue="all" className="space-y-4">
      <TabsList>
        <TabsTrigger value="all" className="gap-2">
          <Users className="h-4 w-4" />
          All
          {allCollaborations.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {allCollaborations.length}
            </Badge>
          )}
        </TabsTrigger>
        {isMentor && (
          <TabsTrigger value="requests" className="gap-2">
            <Inbox className="h-4 w-4" />
            Requests
            {pendingRequests.length > 0 && (
              <Badge variant="default" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        )}
        {isMentor && (
          <TabsTrigger value="as-mentor" className="gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            As Mentor
            {asMentor.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {asMentor.length}
              </Badge>
            )}
          </TabsTrigger>
        )}
        <TabsTrigger value="as-mentee" className="gap-2">
          <ArrowUpRight className="h-4 w-4" />
          As Mentee
          {asMentee.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {asMentee.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* All Collaborations Tab */}
      <TabsContent value="all" className="space-y-4">
        {allCollaborations.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Active collaborations section */}
            {activeCollaborations.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Active Collaborations
                  <Badge variant="outline">{activeCollaborations.length}</Badge>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeCollaborations.map((collab) => (
                    <CollaborationCard key={collab.id} collaboration={collab} />
                  ))}
                </div>
              </div>
            )}

            {/* All other collaborations */}
            {allCollaborations.filter((c) => c.status !== 'active' && c.status !== 'accepted').length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Other Collaborations</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allCollaborations
                    .filter((c) => c.status !== 'active' && c.status !== 'accepted')
                    .map((collab) => (
                      <CollaborationCard key={collab.id} collaboration={collab} />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </TabsContent>

      {/* Pending Requests Tab (for mentors) */}
      {isMentor && (
        <TabsContent value="requests" className="space-y-4">
          <MentorRequestsList requests={pendingRequests} />
        </TabsContent>
      )}

      {/* As Mentor Tab */}
      {isMentor && (
        <TabsContent value="as-mentor" className="space-y-4">
          {asMentor.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <ArrowDownLeft className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No mentee collaborations</h3>
                <p className="text-sm text-muted-foreground">
                  When mentees request to work with you, they&apos;ll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {asMentor.map((collab) => (
                <CollaborationCard key={collab.id} collaboration={collab} />
              ))}
            </div>
          )}
        </TabsContent>
      )}

      {/* As Mentee Tab */}
      <TabsContent value="as-mentee" className="space-y-4">
        {asMentee.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No mentor collaborations</h3>
              <p className="text-sm text-muted-foreground">
                Find a mentor and request collaboration to get started on your goals.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {asMentee.map((collab) => (
              <CollaborationCard key={collab.id} collaboration={collab} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No collaborations yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Start your mentorship journey by finding a mentor and requesting collaboration,
          or become a mentor to help others achieve their goals.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/mentors"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Find a Mentor
          </a>
          <a
            href="/dashboard/mentor"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Become a Mentor
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-lg mb-4" />
            <Skeleton className="h-8 w-full" />
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function CollaborationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Collaborations</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your mentor-mentee relationships
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <CollaborationsContent />
      </Suspense>
    </div>
  )
}
