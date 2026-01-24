import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Focus Sessions | MentorShape',
  description: 'View and manage your mentoring focus sessions',
}

export default function FocusesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Focus Sessions</h1>
        <p className="text-muted-foreground mt-1">
          Schedule and track your mentoring sessions
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card className="border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Focus Sessions Coming Soon</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            The focus sessions feature is currently under development. Soon you&apos;ll be able to:
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <ul className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto text-left">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Book focus sessions with your mentor
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Get AI-generated agendas before each session
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Join video meetings directly from the platform
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Receive AI summaries and action items after sessions
            </li>
          </ul>

          <div className="pt-4">
            <Link href="/dashboard/collaborations">
              <Button variant="outline" className="gap-2">
                View Collaborations
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
