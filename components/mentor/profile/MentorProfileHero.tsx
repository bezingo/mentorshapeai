'use client'

import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Share2,
  Pencil,
  Globe,
  Clock,
  Briefcase,
  CheckCircle2,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/** Mentor profile data for the hero section */
export interface MentorHeroData {
  id: string
  display_name: string | null
  headline: string | null
  avatar_url: string | null
  public_handle: string
  location: string | null
  timezone: string | null
  years_of_experience: number | null
  expertise_areas: string[]
  languages: string[]
  mentor_since: string | null
  stats: {
    total_ratings: number
    average_rating: number | null
    total_collaborations: number
  }
}

interface MentorProfileHeroProps {
  /** Mentor data to display */
  mentor: MentorHeroData
  /** Whether this is the current user's own profile */
  isOwnProfile: boolean
  /** Callback when share button is clicked */
  onShare?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Format timezone nicely
 */
function formatTimezone(timezone: string | null): string {
  if (!timezone) return ''
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    })
    const parts = formatter.formatToParts(new Date())
    const tzPart = parts.find((part) => part.type === 'timeZoneName')
    return tzPart?.value || timezone
  } catch {
    return timezone
  }
}

/**
 * Star rating display component
 */
function StarRating({
  rating,
  count,
}: {
  rating: number | null
  count: number
}) {
  if (rating === null || count === 0) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Star className="h-4 w-4" />
        <span>No reviews yet</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              'h-4 w-4',
              index < Math.round(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
            )}
          />
        ))}
      </div>
      <span className="text-sm font-medium">{rating.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">
        ({count} review{count !== 1 ? 's' : ''})
      </span>
    </div>
  )
}

/**
 * Enhanced hero section for mentor public profiles.
 * Displays avatar, name, headline, expertise tags, and key stats.
 */
export function MentorProfileHero({
  mentor,
  isOwnProfile,
  onShare,
  className,
}: MentorProfileHeroProps) {
  const handleShare = async () => {
    if (onShare) {
      onShare()
      return
    }

    const profileUrl = `${window.location.origin}/m/${mentor.public_handle}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${mentor.display_name} | Mentor on Mentorshape`,
          text: mentor.headline || 'Check out this mentor on Mentorshape',
          url: profileUrl,
        })
      } catch {
        await navigator.clipboard.writeText(profileUrl)
      }
    } else {
      await navigator.clipboard.writeText(profileUrl)
    }
  }

  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      {/* Avatar */}
      <div className="mb-4 relative">
        {mentor.avatar_url ? (
          <div className="relative h-32 w-32 sm:h-36 sm:w-36">
            <Image
              src={mentor.avatar_url}
              alt={mentor.display_name || 'Mentor'}
              fill
              sizes="144px"
              className="rounded-full object-cover ring-4 ring-background shadow-lg"
              priority
            />
          </div>
        ) : (
          <div className="h-32 w-32 sm:h-36 sm:w-36 rounded-full bg-muted flex items-center justify-center ring-4 ring-background shadow-lg">
            <span className="text-5xl font-semibold text-muted-foreground">
              {mentor.display_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        {/* Verified badge - shown if mentor has completed onboarding */}
        {mentor.mentor_since && (
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
            <CheckCircle2 className="h-6 w-6 text-green-500 fill-green-500/20" />
          </div>
        )}
      </div>

      {/* Name */}
      <h1 className="text-2xl sm:text-3xl font-bold mb-1">
        {mentor.display_name || 'Mentor'}
      </h1>

      {/* Headline */}
      {mentor.headline && (
        <p className="text-muted-foreground text-base sm:text-lg mb-3 max-w-lg">
          {mentor.headline}
        </p>
      )}

      {/* Mentor Badge */}
      <div className="mb-4">
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30">
          Verified Mentor
        </Badge>
      </div>

      {/* Star Rating */}
      <div className="mb-4">
        <StarRating
          rating={mentor.stats.average_rating}
          count={mentor.stats.total_ratings}
        />
      </div>

      {/* Mentor Stats */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mb-4">
        {mentor.years_of_experience !== null && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" />
            <span>{mentor.years_of_experience} years experience</span>
          </div>
        )}
        {mentor.stats.total_collaborations > 0 && (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {mentor.stats.total_collaborations} mentorship
              {mentor.stats.total_collaborations !== 1 ? 's' : ''} completed
            </span>
          </div>
        )}
        {mentor.timezone && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{formatTimezone(mentor.timezone)}</span>
          </div>
        )}
        {mentor.location && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-4 w-4" />
            <span>{mentor.location}</span>
          </div>
        )}
      </div>

      {/* Expertise Tags */}
      {mentor.expertise_areas && mentor.expertise_areas.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          {mentor.expertise_areas.map((area) => (
            <Badge
              key={area}
              variant="secondary"
              className="bg-primary/10 text-primary hover:bg-primary/15"
            >
              {area}
            </Badge>
          ))}
        </div>
      )}

      {/* Languages */}
      {mentor.languages && mentor.languages.length > 0 && (
        <p className="text-sm text-muted-foreground mb-6">
          Speaks: {mentor.languages.join(', ')}
        </p>
      )}

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        {isOwnProfile && (
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/dashboard/profile">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
        )}
        <Button
          onClick={handleShare}
          variant={isOwnProfile ? 'default' : 'outline'}
          className={cn(
            'w-full sm:w-auto',
            !isOwnProfile && 'bg-blue-600 hover:bg-blue-700 text-white'
          )}
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share Profile
        </Button>
      </div>
    </div>
  )
}
