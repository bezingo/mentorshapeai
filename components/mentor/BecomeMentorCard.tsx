'use client'

import { Sparkles, ArrowRight, Users, Calendar, Award } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BecomeMentorCardProps {
  /** Custom class names */
  className?: string
  /** Compact variant for smaller displays */
  compact?: boolean
}

/**
 * CTA card encouraging non-mentors to start the mentor onboarding process.
 * Displayed on the main dashboard for users who are not yet mentors.
 */
export function BecomeMentorCard({ className, compact = false }: BecomeMentorCardProps) {
  const benefits = [
    {
      icon: Users,
      title: 'Help Others Grow',
      description: 'Share your expertise and guide mentees toward their goals',
    },
    {
      icon: Calendar,
      title: 'Flexible Schedule',
      description: 'Set your own availability and work on your terms',
    },
    {
      icon: Award,
      title: 'Earn Recognition',
      description: 'Build your reputation with badges and testimonials',
    },
  ]

  if (compact) {
    return (
      <Card className={cn('bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20', className)}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Become a Mentor</h3>
              <p className="text-sm text-muted-foreground">Share your expertise</p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link href="/mentor/onboarding">
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header with gradient background */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl mb-1">Become a Mentor</CardTitle>
            <CardDescription className="text-base">
              Share your expertise and help others achieve their goals while building your personal brand.
            </CardDescription>
          </div>
        </div>
      </div>

      <CardContent className="p-6 pt-4">
        {/* Benefits list */}
        <div className="space-y-3 mb-6">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div key={benefit.title} className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">{benefit.title}</h4>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA Button */}
        <Button asChild className="w-full">
          <Link href="/mentor/onboarding">
            Start Mentor Onboarding
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>

        {/* Footer note */}
        <p className="text-xs text-center text-muted-foreground mt-4">
          Takes about 5 minutes to complete
        </p>
      </CardContent>
    </Card>
  )
}
