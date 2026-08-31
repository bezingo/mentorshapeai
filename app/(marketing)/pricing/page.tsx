import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Pricing Page - School/Enterprise Focus
 * 
 * M0 school-pilot: This is a B2B school-sold product, not a consumer marketplace.
 * Individual pricing tiers are replaced with enterprise/school contact information.
 */
export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            Mentorshape
          </Link>
          <Link href="/">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Mentorship for Schools & Universities
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Mentorshape partners with educational institutions to deliver outcome-focused
                student mentorship programs.
              </p>
            </div>
            <Card className="p-8 text-center">
              <h3 className="text-2xl font-semibold mb-4">School & University Programs</h3>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Our platform connects students with in-roster mentors for goal-setting,
                career guidance, and personal development. Programs are customized
                for each institution's needs.
              </p>
              <ul className="space-y-3 text-left max-w-md mx-auto mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>AI-powered goal planning & milestone tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Focus sessions with structured agendas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Progress tracking & outcome measurement</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>In-roster mentor matching (coming soon)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Organization & program management</span>
                </li>
              </ul>
              <Button size="lg" asChild>
                <Link href="mailto:hello@mentorshape.ai">Contact Us for Pricing</Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Programs start at the school or department level. No individual consumer pricing.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

