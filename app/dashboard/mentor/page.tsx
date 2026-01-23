import { getCurrentProfile, requireMentor } from '@/lib/clerk'
import { Card } from '@/components/ui/card'

export default async function MentorDashboardPage() {
  await requireMentor()
  const profile = await getCurrentProfile()

  if (!profile) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mentor Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your availability, collaborations, and help mentees achieve their goals.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Active Collaborations</h2>
          <p className="text-sm text-muted-foreground mb-4">
            View and manage your active mentoring relationships.
          </p>
          <a
            href="/dashboard/collaborations"
            className="text-sm font-medium text-primary hover:underline"
          >
            View Collaborations →
          </a>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Availability</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set your weekly availability for mentees to book sessions.
          </p>
          <a
            href="/dashboard/mentor/availability"
            className="text-sm font-medium text-primary hover:underline"
          >
            Manage Availability →
          </a>
        </Card>
      </div>
    </div>
  )
}

