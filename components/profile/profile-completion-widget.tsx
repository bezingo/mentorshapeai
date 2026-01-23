'use client'

import { Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CompletionItem {
  name: string
  points: number
  completed: boolean
}

interface ProfileCompletionWidgetProps {
  completionPercentage: number
  profile: {
    avatar_url?: string | null
    display_name?: string | null
    headline?: string | null
    country?: string | null
    city?: string | null
    bio?: string | null
    date_of_birth?: string | null
    gender?: string | null
    nationality?: string | null
    languages_spoken?: string[]
    can_mentor_for?: string[]
    want_to_learn?: string[]
    specializations?: string[]
    hobbies?: string[]
  }
  workExperiencesCount: number
  educationsCount: number
  skillsCount: number
  className?: string
}

export function ProfileCompletionWidget({
  completionPercentage,
  profile,
  workExperiencesCount,
  educationsCount,
  skillsCount,
  className,
}: ProfileCompletionWidgetProps) {
  // Calculate completion items
  const completionItems: CompletionItem[] = [
    { name: 'Setup account', points: 10, completed: true }, // Always completed
    { name: 'Upload your photo', points: 5, completed: !!profile.avatar_url },
    {
      name: 'Personal Info',
      points: 10,
      completed: !!(profile.display_name && profile.headline),
    },
    { name: 'Location', points: 5, completed: !!(profile.country && profile.city) },
    { name: 'Date of Birth', points: 5, completed: !!profile.date_of_birth },
    { name: 'Gender', points: 5, completed: !!profile.gender },
    { name: 'Nationality', points: 5, completed: !!profile.nationality },
    {
      name: 'Traits',
      points: 20,
      completed:
        (profile.languages_spoken?.length || 0) > 0 ||
        (profile.can_mentor_for?.length || 0) > 0 ||
        (profile.want_to_learn?.length || 0) > 0 ||
        (profile.specializations?.length || 0) > 0 ||
        (profile.hobbies?.length || 0) > 0,
    },
    { name: 'Biography', points: 10, completed: !!profile.bio },
    { name: 'Work History', points: 15, completed: workExperiencesCount > 0 },
    { name: 'Education', points: 10, completed: educationsCount > 0 },
    { name: 'Skills', points: 10, completed: skillsCount > 0 },
  ]

  // Calculate SVG values for circular progress
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference

  return (
    <Card className={cn('sticky top-6', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Complete your profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Circular progress indicator */}
        <div className="flex justify-center">
          <div className="relative h-28 w-28">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="text-primary transition-all duration-500 ease-out"
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{completionPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          {completionItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full',
                    item.completed
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-muted-foreground/30'
                  )}
                >
                  {item.completed ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground/50" />
                  )}
                </div>
                <span
                  className={cn(
                    item.completed ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {item.name}
                </span>
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  item.completed ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.completed ? `${item.points}%` : `+${item.points}%`}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
