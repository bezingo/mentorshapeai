import Link from 'next/link'
import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const { userId } = await auth()

  if (userId) {
    redirect('/journey')
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Mentorshape</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm font-medium hover:underline">
              Pricing
            </Link>
            {userId ? (
              <>
                <Link href="/journey">
                  <Button variant="ghost">Continue journey</Button>
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'h-8 w-8',
                    },
                  }}
                />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="ghost">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button>Get Started</Button>
                </SignUpButton>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              Achieve Your Goals with
              <span className="text-primary"> AI-Powered Mentoring</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Mentorshape helps you set clear goals, find expert mentors, and track your progress
              through structured focus sessions and AI-guided insights.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {userId ? (
                <Link href="/dashboard">
                  <Button size="lg">Go to Dashboard</Button>
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <Button size="lg">Get Started Free</Button>
                </SignUpButton>
              )}
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to achieve your goals
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From goal setting to completion, Mentorshape guides you every step of the way.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">AI Goal Shaping</h3>
                <p className="text-sm text-muted-foreground">
                  Turn your aspirations into structured goals with AI-powered milestone planning.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Expert Mentors</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with mentors who can guide you based on your specific goals and challenges.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Focus Sessions</h3>
                <p className="text-sm text-muted-foreground">
                  AI-generated agendas and summaries help you make the most of every focus session.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Progress Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Track milestones, check-ins, and get AI-powered insights on your progress.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Public Goal Pages</h3>
                <p className="text-sm text-muted-foreground">
                  Share your goals with mentors via a beautiful Linktree-style page.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Organizations</h3>
                <p className="text-sm text-muted-foreground">
                  Perfect for schools, universities, and companies running mentorship programs.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 Mentorshape. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

