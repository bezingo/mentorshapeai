'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Smile,
  Frown,
  Meh,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCurrentWeekStart, MIN_MOOD_RATING, MAX_MOOD_RATING } from '@/lib/validations/check-ins'
import { format } from 'date-fns'

export interface CheckInData {
  weekStart: string
  moodRating: number
  progressNotes?: string | null
  blockers?: string | null
  wins?: string | null
}

interface CheckInFormProps {
  className?: string
  /** Callback when check-in is submitted */
  onSubmit: (data: CheckInData) => Promise<void>
  /** Pre-fill with existing check-in data */
  existingCheckIn?: CheckInData | null
  /** Is form in editing mode */
  isEditing?: boolean
  /** Collaboration ID (for context) */
  collaborationId: string
}

/** Mood emoji configuration (1-5 scale) */
const moodEmojis: Array<{
  value: number
  emoji: string
  label: string
  icon: React.ElementType
  color: string
}> = [
  { value: 1, emoji: '😞', label: 'Struggling', icon: Frown, color: 'text-red-500' },
  { value: 2, emoji: '😕', label: 'Challenged', icon: Frown, color: 'text-orange-500' },
  { value: 3, emoji: '😐', label: 'Okay', icon: Meh, color: 'text-yellow-500' },
  { value: 4, emoji: '🙂', label: 'Good', icon: Smile, color: 'text-lime-500' },
  { value: 5, emoji: '😄', label: 'Great', icon: Smile, color: 'text-green-500' },
]

/**
 * CheckInForm provides a weekly check-in form with mood picker (emoji 1-5),
 * progress notes, blockers, and wins fields.
 */
export function CheckInForm({
  className,
  onSubmit,
  existingCheckIn,
  isEditing = false,
  collaborationId,
}: CheckInFormProps) {
  const [moodRating, setMoodRating] = useState<number | null>(existingCheckIn?.moodRating ?? null)
  const [progressNotes, setProgressNotes] = useState(existingCheckIn?.progressNotes ?? '')
  const [blockers, setBlockers] = useState(existingCheckIn?.blockers ?? '')
  const [wins, setWins] = useState(existingCheckIn?.wins ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekStart = getCurrentWeekStart()
  const selectedMood = moodRating ? moodEmojis.find((m) => m.value === moodRating) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (moodRating === null) {
      setError('Please select how you\'re feeling')
      return
    }

    if (moodRating < MIN_MOOD_RATING || moodRating > MAX_MOOD_RATING) {
      setError('Invalid mood rating')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        weekStart,
        moodRating,
        progressNotes: progressNotes.trim() || null,
        blockers: blockers.trim() || null,
        wins: wins.trim() || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit check-in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {isEditing ? 'Edit Check-in' : 'Weekly Check-in'}
            </CardTitle>
            <CardDescription>
              Week of {format(new Date(weekStart), 'MMMM d, yyyy')}
            </CardDescription>
          </div>
          {existingCheckIn && !isEditing && (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Submitted
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mood Picker */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">How are you feeling this week?</Label>
            <div className="flex items-center justify-between gap-2">
              {moodEmojis.map((mood) => (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() => setMoodRating(mood.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg transition-all',
                    'hover:bg-muted/50 hover:scale-105',
                    moodRating === mood.value
                      ? 'bg-muted ring-2 ring-primary scale-105'
                      : 'bg-transparent'
                  )}
                >
                  <span className="text-3xl" role="img" aria-label={mood.label}>
                    {mood.emoji}
                  </span>
                  <span
                    className={cn(
                      'text-xs',
                      moodRating === mood.value ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {mood.label}
                  </span>
                </button>
              ))}
            </div>
            {selectedMood && (
              <p className="text-sm text-center text-muted-foreground">
                You selected: <span className={selectedMood.color}>{selectedMood.label}</span>
              </p>
            )}
          </div>

          {/* Progress Notes */}
          <div className="space-y-2">
            <Label htmlFor="progress-notes" className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Progress Notes
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="progress-notes"
              placeholder="What progress did you make this week? What did you work on?"
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              rows={3}
              maxLength={5000}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground text-right">
              {progressNotes.length}/5000
            </p>
          </div>

          {/* Wins */}
          <div className="space-y-2">
            <Label htmlFor="wins" className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Wins & Highlights
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="wins"
              placeholder="What went well? Any achievements or breakthroughs?"
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              rows={2}
              maxLength={2000}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground text-right">
              {wins.length}/2000
            </p>
          </div>

          {/* Blockers */}
          <div className="space-y-2">
            <Label htmlFor="blockers" className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Blockers & Challenges
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="blockers"
              placeholder="What's blocking your progress? Any challenges you're facing?"
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              rows={2}
              maxLength={2000}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground text-right">
              {blockers.length}/2000
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || moodRating === null}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : isEditing ? (
              'Update Check-in'
            ) : (
              'Submit Check-in'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
