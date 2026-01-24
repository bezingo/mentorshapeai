'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users, DollarSign, Package, Clock, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PublicMentorOffer } from './OffersSection'

interface RequestMentorshipModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Mentor's display name */
  mentorName: string
  /** Mentor's public handle */
  mentorHandle: string
  /** Available offers to select from */
  offers: PublicMentorOffer[]
  /** Pre-selected offer (optional) */
  selectedOffer?: PublicMentorOffer | null
}

/** Type icon mapping */
const typeIcons: Record<PublicMentorOffer['type'], React.ElementType> = {
  free_collab: Users,
  paid_consult: DollarSign,
  digital_product: Package,
}

/** Type color mapping */
const typeColors: Record<PublicMentorOffer['type'], string> = {
  free_collab: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paid_consult: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  digital_product: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

/**
 * Format price from cents to display string
 */
function formatPrice(priceCents: number | null, currency: string): string {
  if (priceCents === null || priceCents === 0) return 'Free'

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  return formatter.format(priceCents / 100)
}

/**
 * Format duration from minutes to display string
 */
function formatDuration(minutes: number | null): string {
  if (minutes === null) return ''

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`
  }

  return `${hours}h ${remainingMinutes}m`
}

/**
 * Success state component
 */
function SuccessState({ mentorName }: { mentorName: string }) {
  return (
    <div className="flex flex-col items-center py-6">
      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Request Sent!</h3>
      <p className="text-muted-foreground text-center max-w-sm">
        Your mentorship request has been sent to {mentorName}. They&apos;ll be
        notified and can accept or respond to your request.
      </p>
    </div>
  )
}

/**
 * Modal for requesting mentorship with message input and offer selection.
 * Submits a collaboration request to the mentor.
 */
export function RequestMentorshipModal({
  isOpen,
  onClose,
  mentorName,
  mentorHandle,
  offers,
  selectedOffer: initialSelectedOffer,
}: RequestMentorshipModalProps) {
  const router = useRouter()
  const [selectedOfferId, setSelectedOfferId] = useState<string>(
    initialSelectedOffer?.id || ''
  )
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get the selected offer object
  const selectedOffer = offers.find((o) => o.id === selectedOfferId)

  // Determine if this is a free request
  const isFree =
    !selectedOffer ||
    selectedOffer.type === 'free_collab' ||
    !selectedOffer.price_cents

  // Reset state when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset after a delay to allow animation
      setTimeout(() => {
        setSelectedOfferId(initialSelectedOffer?.id || '')
        setMessage('')
        setIsSuccess(false)
        setError(null)
      }, 200)
      onClose()
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // For now, redirect to the goal creation page with mentor pre-filled
      // In the future, this could create a collaboration request directly
      const queryParams = new URLSearchParams({
        mentor: mentorHandle,
        ...(selectedOfferId && { offer: selectedOfferId }),
        ...(message && { message: encodeURIComponent(message) }),
      })

      router.push(`/g/new?${queryParams.toString()}`)
      setIsSuccess(true)

      // Close modal after a short delay to show success
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch {
      setError('Failed to send request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle starting a new goal flow
  const handleStartNewGoal = () => {
    const queryParams = new URLSearchParams({
      mentor: mentorHandle,
    })
    router.push(`/g/new?${queryParams.toString()}`)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {isSuccess ? (
          <SuccessState mentorName={mentorName} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request Mentorship</DialogTitle>
              <DialogDescription>
                Send a mentorship request to {mentorName}. Describe your goal or
                what you&apos;d like help with.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Offer selection */}
              {offers.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="offer">Select an offering (optional)</Label>
                  <Select
                    value={selectedOfferId}
                    onValueChange={setSelectedOfferId}
                  >
                    <SelectTrigger id="offer">
                      <SelectValue placeholder="Choose an offering..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">General Request</SelectItem>
                      {offers.map((offer) => {
                        const TypeIcon = typeIcons[offer.type]
                        return (
                          <SelectItem key={offer.id} value={offer.id}>
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4" />
                              <span>{offer.title}</span>
                              <span className="text-muted-foreground">
                                ({formatPrice(offer.price_cents, offer.currency)}
                                )
                              </span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selected offer details */}
              {selectedOffer && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={cn(typeColors[selectedOffer.type])}>
                      {selectedOffer.type === 'free_collab'
                        ? 'Free'
                        : selectedOffer.type === 'paid_consult'
                          ? 'Paid'
                          : 'Product'}
                    </Badge>
                    <span className="font-semibold">
                      {formatPrice(selectedOffer.price_cents, selectedOffer.currency)}
                    </span>
                  </div>
                  <p className="font-medium text-sm">{selectedOffer.title}</p>
                  {selectedOffer.duration_minutes && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(selectedOffer.duration_minutes)}
                    </div>
                  )}
                </div>
              )}

              {/* Message input */}
              <div className="space-y-2">
                <Label htmlFor="message">Your message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell the mentor about your goal or what you'd like to achieve..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/1000
                </p>
              </div>

              {/* Error message */}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => onClose()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {offers.length === 0 ? (
                <Button onClick={handleStartNewGoal}>
                  Start a Goal
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isFree ? 'Send Request' : 'Continue to Booking'}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
