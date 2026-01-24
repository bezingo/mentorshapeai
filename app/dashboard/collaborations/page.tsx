import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Collaborations | MentorShape',
  description: 'View and manage your mentoring collaborations',
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

      {/* Coming Soon Card */}
      <Card className="border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Collaborations Coming Soon</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            The collaboration feature is currently under development. Soon you&apos;ll be able to:
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <ul className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto text-left">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Request mentorship from experienced mentors
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Accept collaboration requests as a mentor
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Track collaboration progress and milestones
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Schedule focus sessions with your mentor/mentee
            </li>
          </ul>

          <div className="pt-4">
            <Link href="/dashboard/mentee/goals">
              <Button variant="outline" className="gap-2">
                View Your Goals
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
