'use client'

import { motion, useReducedMotion } from 'motion/react'
import { RiCheckLine, RiCloseLine } from '@remixicon/react'
import { cx } from '@/utils/cx'

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

const RING_TRANSITION = { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as const

export function ProfileCompletionWidget({
  completionPercentage,
  profile,
  workExperiencesCount,
  educationsCount,
  skillsCount,
  className,
}: ProfileCompletionWidgetProps) {
  const reduceMotion = useReducedMotion()

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
    <div
      className={cx(
        'sticky top-20 rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-xs',
        className
      )}
    >
      <h2 className="text-headline-semibold text-text-primary">Complete your profile</h2>

      <div className="mt-4 space-y-4">
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
                stroke="var(--color-background-tertiary-default)"
                strokeWidth="8"
              />
              {/* Progress circle draws itself in on mount */}
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="var(--color-accent-500)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={reduceMotion ? false : { strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={RING_TRANSITION}
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-title-2-semibold text-text-primary">{completionPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          {completionItems.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cx(
                    'flex size-5 items-center justify-center rounded-full transition-colors duration-150',
                    item.completed
                      ? 'bg-accent-500 text-white'
                      : 'border border-border-button-default text-foreground-icon-tertiary'
                  )}
                >
                  {item.completed ? (
                    <RiCheckLine className="size-3" aria-hidden />
                  ) : (
                    <RiCloseLine className="size-3" aria-hidden />
                  )}
                </span>
                <span
                  className={cx(
                    'text-body-regular',
                    item.completed ? 'text-text-primary' : 'text-text-tertiary'
                  )}
                >
                  {item.name}
                </span>
              </div>
              <span
                className={cx(
                  'text-caption-1-medium',
                  item.completed ? 'text-button-ghost-foreground' : 'text-text-tertiary'
                )}
              >
                {item.completed ? `${item.points}%` : `+${item.points}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
