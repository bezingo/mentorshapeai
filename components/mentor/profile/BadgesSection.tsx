'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Award,
  Star,
  Trophy,
  Zap,
  Heart,
  Shield,
  Crown,
  Target,
  Flame,
  Medal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** Badge data from the API */
export interface MentorBadge {
  id: string
  type: string
  label: string
  metadata?: Record<string, unknown> | null
  awarded_at: string
}

interface BadgesSectionProps {
  /** List of badges to display */
  badges: MentorBadge[]
  /** Additional CSS classes */
  className?: string
}

/**
 * Badge type to icon mapping
 */
const badgeIcons: Record<string, React.ElementType> = {
  // Achievement badges
  first_mentorship: Award,
  'first-mentorship': Award,
  verified: Shield,
  verified_mentor: Shield,
  'verified-mentor': Shield,

  // Performance badges
  top_rated: Star,
  'top-rated': Star,
  highly_rated: Star,
  'highly-rated': Star,
  five_star: Star,
  '5-star': Star,

  // Milestone badges
  '10_mentorships': Trophy,
  '10-mentorships': Trophy,
  '25_mentorships': Trophy,
  '25-mentorships': Trophy,
  '50_mentorships': Crown,
  '50-mentorships': Crown,
  '100_mentorships': Crown,
  '100-mentorships': Crown,

  // Engagement badges
  quick_responder: Zap,
  'quick-responder': Zap,
  responsive: Zap,
  helpful: Heart,
  supportive: Heart,
  dedicated: Flame,

  // Special badges
  expert: Medal,
  specialist: Target,
  early_adopter: Flame,
  'early-adopter': Flame,
  founding_mentor: Crown,
  'founding-mentor': Crown,
}

/**
 * Badge type to color mapping
 */
const badgeColors: Record<string, string> = {
  // Gold badges
  top_rated: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'top-rated': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  highly_rated: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'highly-rated': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  five_star: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  '5-star': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  '50_mentorships': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  '50-mentorships': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  '100_mentorships': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  '100-mentorships': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  founding_mentor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'founding-mentor': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',

  // Green badges
  verified: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  verified_mentor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'verified-mentor': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  first_mentorship: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'first-mentorship': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',

  // Blue badges
  quick_responder: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'quick-responder': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  responsive: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '10_mentorships': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '10-mentorships': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '25_mentorships': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '25-mentorships': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',

  // Purple badges
  expert: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  specialist: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',

  // Orange badges
  early_adopter: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'early-adopter': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  dedicated: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  flame: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',

  // Pink badges
  helpful: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  supportive: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
}

/**
 * Get the icon for a badge type
 */
function getBadgeIcon(type: string): React.ElementType {
  return badgeIcons[type] || Award
}

/**
 * Get the color classes for a badge type
 */
function getBadgeColor(type: string): string {
  return (
    badgeColors[type] ||
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  )
}

/**
 * Get description for a badge type
 */
function getBadgeDescription(badge: MentorBadge): string {
  const descriptions: Record<string, string> = {
    verified: 'This mentor has been verified by Mentorshape',
    verified_mentor: 'This mentor has been verified by Mentorshape',
    'verified-mentor': 'This mentor has been verified by Mentorshape',
    top_rated: 'Consistently receives 5-star ratings from mentees',
    'top-rated': 'Consistently receives 5-star ratings from mentees',
    highly_rated: 'Maintains an excellent rating from mentees',
    'highly-rated': 'Maintains an excellent rating from mentees',
    first_mentorship: 'Completed their first mentorship',
    'first-mentorship': 'Completed their first mentorship',
    '10_mentorships': 'Has completed 10+ mentorships',
    '10-mentorships': 'Has completed 10+ mentorships',
    '25_mentorships': 'Has completed 25+ mentorships',
    '25-mentorships': 'Has completed 25+ mentorships',
    '50_mentorships': 'Has completed 50+ mentorships',
    '50-mentorships': 'Has completed 50+ mentorships',
    '100_mentorships': 'Has completed 100+ mentorships - Elite Mentor!',
    '100-mentorships': 'Has completed 100+ mentorships - Elite Mentor!',
    quick_responder: 'Typically responds within 24 hours',
    'quick-responder': 'Typically responds within 24 hours',
    responsive: 'Known for quick and helpful responses',
    helpful: 'Frequently praised for being helpful',
    supportive: 'Known for being supportive and encouraging',
    dedicated: 'Shows exceptional dedication to mentees',
    expert: 'Recognized expert in their field',
    specialist: 'Specialized expertise in a specific area',
    early_adopter: 'One of the first mentors on Mentorshape',
    'early-adopter': 'One of the first mentors on Mentorshape',
    founding_mentor: 'A founding mentor of Mentorshape',
    'founding-mentor': 'A founding mentor of Mentorshape',
  }

  return descriptions[badge.type] || badge.label
}

/**
 * Single badge display with tooltip
 */
function BadgeItem({ badge }: { badge: MentorBadge }) {
  const Icon = getBadgeIcon(badge.type)
  const colorClasses = getBadgeColor(badge.type)
  const description = getBadgeDescription(badge)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-full cursor-default transition-transform hover:scale-105',
            colorClasses
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">{badge.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{description}</p>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Display mentor badges earned with descriptions.
 * Shows all badges with hover tooltips explaining what each badge is for.
 */
export function BadgesSection({ badges, className }: BadgesSectionProps) {
  if (!badges || badges.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h2 className="text-lg font-semibold">Badges</h2>

      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <BadgeItem key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  )
}
