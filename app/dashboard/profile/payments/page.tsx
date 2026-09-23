import { Suspense } from 'react'
import { MentorPaymentsPanel } from '@/components/profile/mentor-payments-panel'
import { ProfileSubpageShell } from '@/components/profile/profile-subpage-shell'

export default function ProfilePaymentsPage() {
  return (
    <ProfileSubpageShell
      title="Payments"
      description="Connect Stripe to receive payouts from paid mentor offers."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <MentorPaymentsPanel />
      </Suspense>
    </ProfileSubpageShell>
  )
}
