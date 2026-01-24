'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ProgressScore {
  id: string
  score: number
  trend: 'up' | 'down' | 'stable'
  previousScore?: number | null
  recommendations?: string[] | null
  generatedAt: string
}

interface ProgressScoreCardProps {
  score: ProgressScore | null
  className?: string
  /** Show compact version without recommendations */
  compact?: boolean
}

/** Get color based on score value */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

/** Get stroke color for SVG circle */
function getStrokeColor(score: number): string {
  if (score >= 80) return 'stroke-green-500'
  if (score >= 60) return 'stroke-yellow-500'
  if (score >= 40) return 'stroke-orange-500'
  return 'stroke-red-500'
}

/** Get trend info */
function getTrendInfo(trend: 'up' | 'down' | 'stable'): {
  icon: React.ElementType
  label: string
  color: string
} {
  switch (trend) {
    case 'up':
      return { icon: TrendingUp, label: 'Improving', color: 'text-green-600' }
    case 'down':
      return { icon: TrendingDown, label: 'Declining', color: 'text-red-600' }
    default:
      return { icon: Minus, label: 'Stable', color: 'text-yellow-600' }
  }
}

/**
 * ProgressScoreCard displays a circular progress score visualization
 * with trend indicator and optional recommendations.
 */
export function ProgressScoreCard({ score, className, compact = false }: ProgressScoreCardProps) {
  if (!score) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No progress score yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Check back after your first focus session
          </p>
        </CardContent>
      </Card>
    )
  }

  const trendInfo = getTrendInfo(score.trend)
  const TrendIcon = trendInfo.icon

  // Calculate circle progress
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score.score / 100) * circumference

  // Calculate change from previous score
  const scoreChange = score.previousScore != null ? score.score - score.previousScore : null

  return (
    <Card className={className}>
      {!compact && (
        <CardHeader>
          <CardTitle className="text-base">Progress Score</CardTitle>
          <CardDescription>Overall goal progress assessment</CardDescription>
        </CardHeader>
      )}
      <CardContent className={compact ? 'pt-6' : ''}>
        <div className={cn('flex', compact ? 'items-center gap-4' : 'flex-col items-center')}>
          {/* Circular Progress */}
          <div className={cn('relative', compact ? 'h-20 w-20' : 'h-32 w-32 mb-4')}>
            <svg
              className="transform -rotate-90 h-full w-full"
              viewBox="0 0 100 100"
            >
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                className="stroke-muted"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                className={cn('transition-all duration-500 ease-out', getStrokeColor(score.score))}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            {/* Score text in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('font-bold', compact ? 'text-xl' : 'text-3xl', getScoreColor(score.score))}>
                {score.score}
              </span>
              {!compact && <span className="text-xs text-muted-foreground">out of 100</span>}
            </div>
          </div>

          {/* Score info */}
          <div className={cn(compact ? 'flex-1' : 'text-center w-full')}>
            {/* Trend indicator */}
            <div className={cn('flex items-center gap-2', compact ? '' : 'justify-center mb-2')}>
              <Badge
                variant="outline"
                className={cn('gap-1', trendInfo.color)}
              >
                <TrendIcon className="h-3 w-3" />
                {trendInfo.label}
              </Badge>
              {scoreChange != null && (
                <span className={cn(
                  'text-sm font-medium',
                  scoreChange > 0 ? 'text-green-600' : scoreChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                )}>
                  {scoreChange > 0 ? '+' : ''}{scoreChange}
                </span>
              )}
            </div>

            {/* Recommendations (non-compact only) */}
            {!compact && score.recommendations && score.recommendations.length > 0 && (
              <div className="mt-4 text-left">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recommendations</p>
                <ul className="space-y-1">
                  {score.recommendations.slice(0, 3).map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
