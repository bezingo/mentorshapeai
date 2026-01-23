import { getCurrentProfile, requireMentee } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function GoalsPage() {
  await requireMentee()
  const profile = await getCurrentProfile()
  
  if (!profile) {
    return <div>Loading...</div>
  }

  // Use service client to bypass RLS since we've already verified authorization
  const supabase = createServiceClient()
  const { data: goals, error } = await supabase
    .from('goals')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching goals:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Goals</h1>
          <p className="text-muted-foreground">
            Create and manage your goals to achieve your aspirations.
          </p>
        </div>
        <Link href="/dashboard/mentee/goals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Goal
          </Button>
        </Link>
      </div>

      {!goals || goals.length === 0 ? (
        <Card className="p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">No goals yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first goal to get started on your journey.
          </p>
          <Link href="/dashboard/mentee/goals/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Goal
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Card key={goal.id} className="p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold">{goal.title}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-muted">
                  {goal.status}
                </span>
              </div>
              {goal.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {goal.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {goal.duration_days} days
                </span>
                <Link href={`/dashboard/mentee/goals/${goal.id}`}>
                  <Button variant="ghost" size="sm">
                    View →
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

