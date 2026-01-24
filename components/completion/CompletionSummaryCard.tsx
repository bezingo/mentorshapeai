'use client'

import {
  Trophy,
  Target,
  Sparkles,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface Achievement {
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
}

export interface SkillDeveloped {
  skill: string
  level: 'introduced' | 'developed' | 'mastered'
  evidence: string
}

export interface CompletionSummaryData {
  final_summary: string
  key_achievements: Achievement[]
  skills_developed: SkillDeveloped[]
  journey_highlights: string[]
  mentor_contribution: string
  next_steps: string[]
  overall_progress_rating: number
}

export interface CompletionSummaryCardProps {
  /** The completion summary data */
  summary: CompletionSummaryData | null
  /** Goal title for display */
  goalTitle?: string
  /** Whether the summary is loading */
  isLoading?: boolean
  /** Error message if loading failed */
  error?: string | null
  /** Whether to show as compact (fewer sections) */
  compact?: boolean
}

/**
 * Impact badge color mapping
 */
const impactColors: Record<string, string> = {
  high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

/**
 * Skill level badge color mapping
 */
const levelColors: Record<string, string> = {
  introduced: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  developed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  mastered: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

/**
 * Progress rating to emoji mapping
 */
const ratingEmojis: Record<number, string> = {
  1: '😕',
  2: '🙂',
  3: '😊',
  4: '🎉',
  5: '🏆',
}

/**
 * CompletionSummaryCard - Display AI-generated completion summary with achievements and skills
 */
export function CompletionSummaryCard({
  summary,
  goalTitle,
  isLoading = false,
  error = null,
  compact = false,
}: CompletionSummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Generating your completion summary...</p>
            <p className="text-xs">This may take a moment</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-2">
            <p className="text-destructive font-medium">Failed to load summary</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Completion Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              No summary available yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              A summary will be generated when you complete your goal
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {goalTitle ? `Congratulations on completing "${goalTitle}"!` : 'Goal Completed!'}
              </CardTitle>
              <CardDescription className="mt-1">
                Here&apos;s a summary of your journey and achievements
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
              <span className="text-2xl">{ratingEmojis[summary.overall_progress_rating]}</span>
              <span className="text-sm font-medium">{summary.overall_progress_rating}/5</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <p className="text-sm leading-relaxed whitespace-pre-line">{summary.final_summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Key Achievements */}
      {summary.key_achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-green-500" />
              Key Achievements
              <Badge variant="secondary" className="text-xs">
                {summary.key_achievements.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {summary.key_achievements.map((achievement, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{achievement.title}</p>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          impactColors[achievement.impact]
                        )}
                      >
                        {achievement.impact} impact
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Skills Developed */}
      {!compact && summary.skills_developed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Skills Developed
              <Badge variant="secondary" className="text-xs">
                {summary.skills_developed.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {summary.skills_developed.map((skill, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5"
                >
                  <TrendingUp className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{skill.skill}</p>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full capitalize',
                          levelColors[skill.level]
                        )}
                      >
                        {skill.level}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{skill.evidence}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Journey Highlights */}
      {!compact && summary.journey_highlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Journey Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.journey_highlights.map((highlight, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5"
                >
                  <span className="text-lg shrink-0">✨</span>
                  <span className="text-sm">{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Mentor Contribution */}
      {!compact && summary.mentor_contribution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-xl">🤝</span>
              Mentor&apos;s Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{summary.mentor_contribution}</p>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {!compact && summary.next_steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRight className="h-5 w-5 text-blue-500" />
              Recommended Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.next_steps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5"
                >
                  <span className="h-5 w-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
