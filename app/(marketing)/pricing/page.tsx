import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PricingTableSection } from '@/components/pricing/pricing-table-section'

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            Mentorshape
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/sign-up">
              <Button>Get started</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost">Back to Home</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Simple, transparent pricing
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Mentee subscriptions are powered by Clerk Billing. Mentor payouts use Stripe Connect.
              </p>
            </div>
            <PricingTableSection />
            <p className="text-center text-sm text-muted-foreground mt-8">
              Configure plans in the Clerk Dashboard. Paid mentor consultations are billed separately
              at booking time.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
