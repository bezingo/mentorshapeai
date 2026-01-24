import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Simple, transparent pricing
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Choose the plan that's right for you. All plans include core features.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-2">Free</h3>
                <p className="text-3xl font-bold mb-4">$0</p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li>• Create up to 3 goals</li>
                  <li>• Basic goal tracking</li>
                  <li>• Public goal pages</li>
                </ul>
                <Button className="w-full" variant="outline">
                  Get Started
                </Button>
              </Card>
              <Card className="p-6 border-primary">
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <p className="text-3xl font-bold mb-4">$29<span className="text-sm font-normal">/mo</span></p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li>• Unlimited goals</li>
                  <li>• AI-powered goal shaping</li>
                  <li>• Focus session planning & summaries</li>
                  <li>• Progress tracking</li>
                </ul>
                <Button className="w-full">Get Started</Button>
              </Card>
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <p className="text-3xl font-bold mb-4">Custom</p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li>• Everything in Pro</li>
                  <li>• Organization features</li>
                  <li>• AI matching</li>
                  <li>• Custom integrations</li>
                </ul>
                <Button className="w-full" variant="outline">
                  Contact Sales
                </Button>
              </Card>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-8">
              Note: Pricing is managed through Clerk Billing. Plans can be configured in the Clerk Dashboard.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

