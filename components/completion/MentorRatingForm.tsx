'use client'

import { useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export interface MentorRatingFormProps {
  /** Current rating value (1-5) */
  rating?: number
  /** Current feedback text */
  feedback?: string
  /** Mentor's display name */
  mentorName?: string
  /** Callback when rating or feedback changes */
  onChange?: (data: { rating: number; feedback: string }) => void
  /** Callback when form is submitted */
  onSubmit?: (data: { rating: number; feedback: string }) => Promise<void>
  /** Whether the form is in a loading state */
  isLoading?: boolean
  /** Whether the form is disabled */
  disabled?: boolean
  /** Whether to show as compact (no card wrapper) */
  compact?: boolean
}

/**
 * Star rating labels for accessibility and display
 */
const RATING_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: 'Poor', description: 'Did not meet expectations' },
  2: { label: 'Fair', description: 'Below expectations' },
  3: { label: 'Good', description: 'Met expectations' },
  4: { label: 'Great', description: 'Exceeded expectations' },
  5: { label: 'Excellent', description: 'Outstanding mentorship' },
}

/**
 * MentorRatingForm - Form for rating a mentor with 1-5 stars and optional feedback
 */
export function MentorRatingForm({
  rating: initialRating,
  feedback: initialFeedback = '',
  mentorName,
  onChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  compact = false,
}: MentorRatingFormProps) {
  const [rating, setRating] = useState<number>(initialRating || 0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>(initialFeedback)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const displayRating = hoveredRating || rating

  const handleRatingChange = (newRating: number) => {
    if (disabled || isLoading) return
    setRating(newRating)
    onChange?.({ rating: newRating, feedback })
  }

  const handleFeedbackChange = (newFeedback: string) => {
    setFeedback(newFeedback)
    onChange?.({ rating, feedback: newFeedback })
  }

  const handleSubmit = async () => {
    if (!onSubmit || rating === 0) return
    setIsSubmitting(true)
    try {
      await onSubmit({ rating, feedback })
    } finally {
      setIsSubmitting(false)
    }
  }

  const content = (
    <div className="space-y-6">
      {/* Star Rating */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={cn(
                'p-1.5 transition-all duration-150 rounded-lg',
                'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                disabled && 'cursor-not-allowed opacity-50'
              )}
              onClick={() => handleRatingChange(value)}
              onMouseEnter={() => !disabled && setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(0)}
              disabled={disabled || isLoading}
              aria-label={`Rate ${value} out of 5 stars - ${RATING_LABELS[value].label}`}
            >
              <Star
                className={cn(
                  'h-10 w-10 transition-colors duration-150',
                  value <= displayRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-muted text-muted-foreground/30'
                )}
              />
            </button>
          ))}
        </div>

        {/* Rating Label */}
        <div className="text-center min-h-[48px]">
          {displayRating > 0 ? (
            <div className="space-y-0.5">
              <p className="font-medium text-lg">{RATING_LABELS[displayRating].label}</p>
              <p className="text-sm text-muted-foreground">
                {RATING_LABELS[displayRating].description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Click a star to rate</p>
          )}
        </div>
      </div>

      {/* Feedback Textarea */}
      <div className="space-y-2">
        <label htmlFor="mentor-feedback" className="text-sm font-medium">
          Share your experience (optional)
        </label>
        <Textarea
          id="mentor-feedback"
          placeholder={`What made working with ${mentorName || 'your mentor'} special? Share specific ways they helped you...`}
          value={feedback}
          onChange={(e) => handleFeedbackChange(e.target.value)}
          disabled={disabled || isLoading}
          rows={4}
          maxLength={1000}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {feedback.length}/1000 characters
        </p>
      </div>

      {/* Submit Button (only if onSubmit is provided) */}
      {onSubmit && (
        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting || isLoading || disabled}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Rating'
          )}
        </Button>
      )}
    </div>
  )

  if (compact) {
    return content
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Rate Your Mentor
        </CardTitle>
        <CardDescription>
          {mentorName
            ? `How was your experience working with ${mentorName}?`
            : 'How was your mentorship experience?'}
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
