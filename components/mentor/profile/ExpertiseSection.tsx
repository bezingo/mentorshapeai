'use client'

import { useState } from 'react'
import {
  Briefcase,
  Code,
  Lightbulb,
  TrendingUp,
  Users,
  Target,
  BookOpen,
  Award,
  Heart,
  Rocket,
  Palette,
  BarChart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** Expertise area data */
export interface ExpertiseAreaData {
  name: string
}

interface ExpertiseSectionProps {
  /** List of expertise areas */
  expertiseAreas: string[]
  /** Additional areas the mentor can help with */
  canMentorFor?: string[]
  /** Mentor's specializations */
  specializations?: string[]
  /** Maximum items to show before collapse */
  maxVisible?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Icon mapping for common expertise areas
 */
const expertiseIcons: Record<string, React.ElementType> = {
  // Career & Leadership
  'career coaching': Briefcase,
  'career development': Briefcase,
  'career transition': Briefcase,
  leadership: Users,
  management: Users,
  'team building': Users,
  mentoring: Heart,

  // Technical
  'software engineering': Code,
  programming: Code,
  'web development': Code,
  'mobile development': Code,
  engineering: Code,
  technology: Code,
  'machine learning': Code,
  'data science': BarChart,
  analytics: BarChart,

  // Business
  entrepreneurship: Rocket,
  'startup advice': Rocket,
  startups: Rocket,
  'product management': Target,
  'product development': Target,
  strategy: TrendingUp,
  'business strategy': TrendingUp,
  growth: TrendingUp,
  marketing: TrendingUp,
  sales: TrendingUp,
  finance: BarChart,

  // Learning & Development
  'interview prep': BookOpen,
  'technical interviews': BookOpen,
  'resume review': BookOpen,
  education: BookOpen,
  learning: BookOpen,
  'public speaking': Award,
  presentation: Award,
  communication: Award,

  // Creative
  design: Palette,
  'ux design': Palette,
  'ui design': Palette,
  'product design': Palette,
  creativity: Lightbulb,
  innovation: Lightbulb,

  // Personal
  'work-life balance': Heart,
  wellness: Heart,
  'personal development': Heart,
  motivation: Heart,
}

/**
 * Get the appropriate icon for an expertise area
 */
function getExpertiseIcon(area: string): React.ElementType {
  const lowerArea = area.toLowerCase()

  // Check for exact match
  if (expertiseIcons[lowerArea]) {
    return expertiseIcons[lowerArea]
  }

  // Check for partial match
  for (const [key, icon] of Object.entries(expertiseIcons)) {
    if (lowerArea.includes(key) || key.includes(lowerArea)) {
      return icon
    }
  }

  // Default icon
  return Lightbulb
}

/**
 * Single expertise item display
 */
function ExpertiseItem({ name }: { name: string }) {
  const Icon = getExpertiseIcon(name)

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="font-medium text-sm">{name}</span>
    </div>
  )
}

/**
 * Expertise areas display with icons in a visually appealing grid/list.
 * Shows all expertise areas with expandable view if there are many.
 */
export function ExpertiseSection({
  expertiseAreas,
  canMentorFor = [],
  specializations = [],
  maxVisible = 6,
  className,
}: ExpertiseSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Combine all areas, removing duplicates
  const allAreas = [
    ...new Set([...expertiseAreas, ...canMentorFor, ...specializations]),
  ]

  if (allAreas.length === 0) {
    return null
  }

  const visibleAreas = isExpanded ? allAreas : allAreas.slice(0, maxVisible)
  const hasMore = allAreas.length > maxVisible

  return (
    <div className={cn('space-y-4', className)}>
      <h2 className="text-lg font-semibold">Expertise Areas</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visibleAreas.map((area) => (
          <ExpertiseItem key={area} name={area} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors mx-auto"
        >
          {isExpanded ? (
            <>
              Show less
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Show {allAreas.length - maxVisible} more
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
