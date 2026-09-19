import Link from 'next/link'
import { UserProfile } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SubscriptionBadge } from '@/components/billing/subscription-badge'

export default function BillingSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">
            Manage your Mentorshape subscription through Clerk Billing.
          </p>
        </div>
        <SubscriptionBadge />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription plans</CardTitle>
          <CardDescription>
            Upgrade to Pro for unlimited goals, collaborations, and AI features. Plans are configured
            in the Clerk Dashboard and synced automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/pricing">View pricing</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/profile/transactions">Mentor transactions</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-lg border overflow-hidden flex justify-center p-4">
        <UserProfile />
      </div>
    </div>
  )
}
