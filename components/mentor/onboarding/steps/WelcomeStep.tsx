'use client'

import { useUser } from '@clerk/nextjs'
import { Award, Calendar, DollarSign, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

/**
 * Step 1: Welcome screen for mentor onboarding
 * Shows user's avatar/name, mentor benefits, and prepares them for the onboarding process
 */
export function WelcomeStep() {
  const { user } = useUser()

  const avatarUrl = user?.imageUrl
  const displayName = user?.fullName || user?.firstName || 'there'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="text-center space-y-8 py-8">
      {/* User greeting */}
      <div className="flex flex-col items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="text-xl">{initials || '?'}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <p className="text-muted-foreground">Welcome, {displayName}!</p>
          <h1 className="text-3xl font-bold tracking-tight">
            Become a Mentor on Mentorshape
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mt-2">
            Share your expertise, help others grow, and build meaningful connections
            with mentees around the world.
          </p>
        </div>
      </div>

      {/* Benefits list */}
      <div className="grid gap-4 max-w-xl mx-auto text-left">
        <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Earn Recognition</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Build your reputation with badges and testimonials from mentees.
              Showcase your expertise and grow your professional profile.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Flexible Schedule</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set your own availability and connect your calendar for automatic sync.
              Mentor when it works for you.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Optional Paid Consultations</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Offer free collaborations or set up paid consultation services.
              You decide how you want to help.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Make an Impact</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Help others achieve their goals and make a real difference in their
              careers. Your experience matters.
            </p>
          </div>
        </div>
      </div>

      {/* What to expect */}
      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground">
          This will only take about 5 minutes. Your progress is saved automatically.
        </p>
      </div>
    </div>
  )
}
