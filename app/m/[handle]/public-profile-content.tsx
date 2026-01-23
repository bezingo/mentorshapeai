'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Star, Share2, Pencil, Globe, Clock, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

// Profile type definition
interface Profile {
  id: string
  user_id: string
  public_handle: string
  display_name: string | null
  headline: string | null
  bio: string | null
  avatar_url: string | null
  is_mentor: boolean
  is_mentee: boolean
  country: string | null
  city: string | null
  timezone: string | null
  years_of_experience: number | null
  expertise_areas: string[]
  languages: string[]
  languages_spoken: string[]
  can_mentor_for: string[]
  want_to_learn: string[]
  specializations: string[]
  hobbies: string[]
  traits_public: boolean
  work_history_public: boolean
  education_public: boolean
  skills_public: boolean
  updated_at: string | null
}

interface WorkExperience {
  id: string
  profile_id: string
  company: string
  title: string
  start_date: string
  end_date: string | null
  description: string | null
  is_current: boolean
}

interface Education {
  id: string
  profile_id: string
  institution: string
  degree: string
  start_date: string
  end_date: string | null
  is_current: boolean
}

interface Skill {
  id: string
  profile_id: string
  name: string
  level: string
}

interface PublicProfileContentProps {
  profile: Profile
  workExperiences: WorkExperience[]
  educations: Education[]
  skills: Skill[]
  currentCompany: string | null
  currentUniversity: string | null
  isOwnProfile: boolean
}

// Helper to format date range (year only)
function formatDateRange(startDate: string, endDate: string | null, isCurrent?: boolean): string {
  const startYear = new Date(startDate).getFullYear()

  if (isCurrent || !endDate) {
    return `${startYear}-Present`
  }

  const endYear = new Date(endDate).getFullYear()
  return `${startYear}-${endYear}`
}

// Helper to calculate days since update
function getDaysSinceUpdate(updatedAt: string | null): number {
  if (!updatedAt) return 0
  const updated = new Date(updatedAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - updated.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Helper to format timezone nicely
function formatTimezone(timezone: string | null): string {
  if (!timezone) return ''
  // Convert IANA timezone to readable format
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

// Tag color configurations matching the visual design
const tagColors = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

// Colorful hobby colors that cycle
const hobbyColors = [
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
]

// Collapsible Section Component
function CollapsibleSection({
  title,
  updatedDaysAgo,
  children,
  defaultExpanded = true,
}: {
  title: string
  updatedDaysAgo?: number
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border-b border-border pb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between py-4"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {updatedDaysAgo !== undefined && (
            <span>Update {updatedDaysAgo} days ago</span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>
      {isExpanded && <div className="pt-2">{children}</div>}
    </div>
  )
}

// Star Rating Component
function StarRating({ rating = 0, maxRating = 5 }: { rating?: number; maxRating?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            'h-5 w-5',
            index < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
          )}
        />
      ))}
    </div>
  )
}

// Tag Display Component
function TagDisplay({
  label,
  tags,
  colorType,
}: {
  label: string
  tags: string[]
  colorType: 'blue' | 'yellow' | 'gray' | 'colorful'
}) {
  if (tags.length === 0) return null

  const getTagColor = (index: number) => {
    if (colorType === 'colorful') {
      return hobbyColors[index % hobbyColors.length]
    }
    return tagColors[colorType]
  }

  return (
    <div className="py-3 border-b border-border/50 last:border-b-0">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span
            key={tag}
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
              getTagColor(index)
            )}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

export function PublicProfileContent({
  profile,
  workExperiences,
  educations,
  skills,
  currentCompany,
  currentUniversity,
  isOwnProfile,
}: PublicProfileContentProps) {
  const daysSinceUpdate = getDaysSinceUpdate(profile.updated_at)

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/m/${profile.public_handle}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.display_name} | Mentor on Mentorshape`,
          text: profile.headline || 'Check out this mentor on Mentorshape',
          url: profileUrl,
        })
      } catch {
        // User cancelled share or share failed, fall back to clipboard
        await navigator.clipboard.writeText(profileUrl)
      }
    } else {
      await navigator.clipboard.writeText(profileUrl)
      // Could add toast notification here
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Avatar */}
          <div className="mb-4">
            {profile.avatar_url ? (
              <div className="relative h-28 w-28 sm:h-32 sm:w-32">
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name || 'Mentor'}
                  fill
                  sizes="128px"
                  className="rounded-full object-cover ring-4 ring-background shadow-lg"
                  priority
                />
              </div>
            ) : (
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-muted flex items-center justify-center ring-4 ring-background shadow-lg">
                <span className="text-4xl font-semibold text-muted-foreground">
                  {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

          {/* Name */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            {profile.display_name || 'Mentor'}
          </h1>

          {/* Current Company and University */}
          <p className="text-muted-foreground text-sm sm:text-base">
            {[currentCompany, currentUniversity].filter(Boolean).join(' - ')}
          </p>

          {/* Role Badge */}
          <div className="mt-3">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                profile.is_mentor
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              )}
            >
              {profile.is_mentor ? 'I am a mentor' : 'I am a mentee'}
            </span>
          </div>

          {/* Star Rating (placeholder for future ratings feature) */}
          <div className="mt-3">
            <StarRating rating={3} />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full sm:w-auto">
            {isOwnProfile && (
              <Button variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/dashboard/profile">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
            )}
            <Button
              onClick={handleShareProfile}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share my Profile
            </Button>
          </div>
        </div>

        {/* Mentor-Specific Fields */}
        {profile.is_mentor && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            {profile.years_of_experience !== null && (
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                <span>{profile.years_of_experience} years experience</span>
              </div>
            )}
            {profile.timezone && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{formatTimezone(profile.timezone)}</span>
              </div>
            )}
            {profile.country && (
              <div className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                <span>
                  {[profile.city, profile.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Expertise Areas (for mentors) */}
        {profile.is_mentor && profile.expertise_areas && profile.expertise_areas.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {profile.expertise_areas.map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages (for mentors) */}
        {profile.is_mentor && profile.languages && profile.languages.length > 0 && (
          <div className="mb-8 text-center text-sm text-muted-foreground">
            <span>Speaks: {profile.languages.join(', ')}</span>
          </div>
        )}

        {/* Main Content Sections */}
        <div className="space-y-2">
          {/* My Career Path */}
          {profile.work_history_public && workExperiences.length > 0 && (
            <CollapsibleSection
              title="My Career Path"
              updatedDaysAgo={daysSinceUpdate}
            >
              <div className="space-y-4">
                {workExperiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-start justify-between py-2"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{exp.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {exp.company}
                      </p>
                      {exp.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {exp.description}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground ml-4 whitespace-nowrap">
                      {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* My Academic Path */}
          {profile.education_public && educations.length > 0 && (
            <CollapsibleSection
              title="My Academic Path"
              updatedDaysAgo={daysSinceUpdate}
            >
              <div className="space-y-4">
                {educations.map((edu) => (
                  <div
                    key={edu.id}
                    className="flex items-start justify-between py-2"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{edu.degree}</p>
                      <p className="text-sm text-muted-foreground">
                        at {edu.institution}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground ml-4 whitespace-nowrap">
                      {formatDateRange(edu.start_date, edu.end_date, edu.is_current)}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Traits Section */}
          {profile.traits_public && (
            <CollapsibleSection
              title="Traits"
              updatedDaysAgo={daysSinceUpdate}
            >
              <div className="space-y-0">
                <TagDisplay
                  label="Languages"
                  tags={profile.languages_spoken || []}
                  colorType="blue"
                />
                <TagDisplay
                  label="I can mentor for"
                  tags={profile.can_mentor_for || []}
                  colorType="yellow"
                />
                <TagDisplay
                  label="Want to learn more on"
                  tags={profile.want_to_learn || []}
                  colorType="yellow"
                />
                <TagDisplay
                  label="I specialize in"
                  tags={profile.specializations || []}
                  colorType="gray"
                />
                <TagDisplay
                  label="My Hobbies are"
                  tags={profile.hobbies || []}
                  colorType="colorful"
                />
              </div>
            </CollapsibleSection>
          )}

          {/* Skills */}
          {profile.skills_public && skills.length > 0 && (
            <CollapsibleSection
              title="Skills"
              updatedDaysAgo={daysSinceUpdate}
            >
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>

        {/* Request Mentorship CTA - Only show for visitors (not own profile) */}
        {!isOwnProfile && (
          <div className="mt-8 pt-6 border-t">
            <Button
              asChild
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              <Link href={`/g/new?mentor=${profile.public_handle}`}>
                Request Mentorship
              </Link>
            </Button>
          </div>
        )}

        {/* Bio Section */}
        {profile.bio && (
          <div className="mt-8 pt-6 border-t">
            <h2 className="text-lg font-semibold mb-3">About</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}
      </div>
    </div>
  )
}
