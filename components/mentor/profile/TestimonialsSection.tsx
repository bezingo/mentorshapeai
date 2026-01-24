'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Testimonial data from the API */
export interface Testimonial {
  id: string
  score: number
  feedback: string | null
  mentee: {
    id: string
    display_name: string | null
    avatar_url: string | null
    headline: string | null
  } | null
  goal: {
    title: string
    category: string | null
  } | null
  collaboration_end_date: string | null
}

/** Testimonials API response */
interface TestimonialsResponse {
  data: {
    testimonials: Testimonial[]
    meta: {
      total: number
      limit: number
      offset: number
      has_more: boolean
      average_rating: number | null
    }
  }
}

interface TestimonialsSectionProps {
  /** Mentor handle for fetching testimonials */
  mentorHandle: string
  /** Initial testimonials data (for SSR) */
  initialData?: TestimonialsResponse['data']
  /** Number of testimonials per page */
  pageSize?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Star rating display component
 */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            'h-4 w-4',
            index < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Single testimonial card
 */
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const mentee = testimonial.mentee
  const goal = testimonial.goal

  // Format the date if available
  const formattedDate = testimonial.collaboration_end_date
    ? new Date(testimonial.collaboration_end_date).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <div className="bg-muted/30 rounded-xl p-5 space-y-4">
      {/* Quote icon and rating */}
      <div className="flex items-start justify-between">
        <Quote className="h-8 w-8 text-primary/20" />
        <StarRating rating={testimonial.score} />
      </div>

      {/* Feedback text */}
      {testimonial.feedback ? (
        <p className="text-foreground leading-relaxed italic">
          &ldquo;{testimonial.feedback}&rdquo;
        </p>
      ) : (
        <p className="text-muted-foreground italic">
          {testimonial.score >= 4
            ? 'Great mentorship experience!'
            : 'Thank you for the mentorship.'}
        </p>
      )}

      {/* Mentee info */}
      <div className="flex items-center gap-3 pt-2 border-t border-border/50">
        {mentee?.avatar_url ? (
          <div className="relative h-10 w-10 flex-shrink-0">
            <Image
              src={mentee.avatar_url}
              alt={mentee.display_name || 'Mentee'}
              fill
              sizes="40px"
              className="rounded-full object-cover"
            />
          </div>
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-muted-foreground">
              {mentee?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {mentee?.display_name || 'Anonymous'}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {goal && <span className="truncate">{goal.title}</span>}
            {goal && formattedDate && <span>&middot;</span>}
            {formattedDate && <span>{formattedDate}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty state when there are no testimonials
 */
function EmptyState() {
  return (
    <div className="text-center py-8">
      <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-muted-foreground">No testimonials yet</p>
      <p className="text-sm text-muted-foreground/70">
        Be the first to work with this mentor!
      </p>
    </div>
  )
}

/**
 * Display testimonials/ratings with pagination and average rating.
 * Supports client-side pagination with API calls.
 */
export function TestimonialsSection({
  mentorHandle,
  initialData,
  pageSize = 3,
  className,
}: TestimonialsSectionProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(
    initialData?.testimonials || []
  )
  const [meta, setMeta] = useState(
    initialData?.meta || {
      total: 0,
      limit: pageSize,
      offset: 0,
      has_more: false,
      average_rating: null,
    }
  )
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.ceil(meta.total / pageSize)

  // Fetch testimonials from API
  const fetchTestimonials = useCallback(
    async (page: number) => {
      setIsLoading(true)
      setError(null)

      try {
        const offset = page * pageSize
        const response = await fetch(
          `/api/public/mentor/${mentorHandle}/testimonials?limit=${pageSize}&offset=${offset}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch testimonials')
        }

        const data: TestimonialsResponse = await response.json()
        setTestimonials(data.data.testimonials)
        setMeta(data.data.meta)
      } catch {
        setError('Failed to load testimonials')
      } finally {
        setIsLoading(false)
      }
    },
    [mentorHandle, pageSize]
  )

  // Load initial data if not provided
  useEffect(() => {
    if (!initialData) {
      fetchTestimonials(0)
    }
  }, [initialData, fetchTestimonials])

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages && newPage !== currentPage) {
      setCurrentPage(newPage)
      fetchTestimonials(newPage)
    }
  }

  // Don't render section if no testimonials and no data
  if (!isLoading && meta.total === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <h2 className="text-lg font-semibold">Testimonials</h2>
        <EmptyState />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with rating */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Testimonials</h2>
        {meta.average_rating !== null && meta.total > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{meta.average_rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              ({meta.total} review{meta.total !== 1 ? 's' : ''})
            </span>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: pageSize }).map((_, index) => (
            <div
              key={index}
              className="bg-muted/30 rounded-xl p-5 animate-pulse"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-8 w-8 bg-muted rounded" />
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-4 w-4 bg-muted rounded" />
                  ))}
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="text-center py-8 text-destructive">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTestimonials(currentPage)}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Testimonials list */}
      {!isLoading && !error && testimonials.length > 0 && (
        <div className="space-y-4">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => handlePageChange(index)}
                className={cn(
                  'h-8 w-8 rounded-full text-sm font-medium transition-colors',
                  currentPage === index
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
