import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/clerk'
import { Card } from '@/components/ui/card'
import { auth } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  // Check Clerk authentication first
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Get profile (will create if missing)
  const profile = await getCurrentProfile()

  // If profile still doesn't exist after ensuring, show error
  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Error setting up profile</h1>
          <p className="text-muted-foreground">
            We couldn't create your profile. Please try refreshing the page.
          </p>
        </div>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            If this issue persists, please contact support.
          </p>
        </Card>
      </div>
    )
  }

  // Determine default view based on roles
  if (profile.is_mentee && !profile.is_mentor) {
    redirect('/dashboard/mentee/goals')
  }

  if (profile.is_mentor && !profile.is_mentee) {
    redirect('/dashboard/mentor')
  }

  // User is both mentor and mentee - show overview
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground">
          Choose a mode to get started or view your overview below.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Mentee Mode</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Manage your goals, track progress, and collaborate with mentors.
          </p>
          <a
            href="/dashboard/mentee/goals"
            className="text-sm font-medium text-primary hover:underline"
          >
            Go to Goals →
          </a>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Mentor Mode</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Manage collaborations, availability, and help mentees achieve their goals.
          </p>
          <a
            href="/dashboard/mentor"
            className="text-sm font-medium text-primary hover:underline"
          >
            Go to Mentor Dashboard →
          </a>
        </Card>
      </div>
    </div>
  )
}

