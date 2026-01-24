'use client'

import { useState, useEffect } from 'react'
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Loader2,
  Check,
  Target,
  Calendar,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface Goal {
  id: string
  title: string
  description: string | null
  status: string
  category: string | null
}

interface MentorOffer {
  id: string
  title: string
  type: 'free_collab' | 'paid_consult' | 'digital_product'
  description: string | null
  duration_minutes: number | null
  price_cents: number | null
  currency: string
}

interface MentorProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  handle: string | null
}

interface CollaborationRequestModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Mentor profile to request collaboration with */
  mentor: MentorProfile
  /** Available mentor offers */
  offers?: MentorOffer[]
  /** Pre-selected goal (optional) */
  selectedGoal?: Goal | null
  /** Pre-selected offer (optional) */
  selectedOffer?: MentorOffer | null
  /** Callback when collaboration is successfully created */
  onSuccess?: (collaborationId: string) => void
}

/** Type color mapping for offers */
const typeColors: Record<MentorOffer['type'], string> = {
  free_collab: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paid_consult: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  digital_product: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const typeLabels: Record<MentorOffer['type'], string> = {
  free_collab: 'Free Collaboration',
  paid_consult: 'Paid Consultation',
  digital_product: 'Digital Product',
}

/** Format price from cents */
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

/** Format duration from minutes */
function formatDuration(minutes: number | null): string {
  if (minutes === null) return ''
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours} hr${hours > 1 ? 's' : ''}`
  return `${hours}h ${remainingMinutes}m`
}

/** Get initials from display name */
function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

/** Success state component */
function SuccessState({ mentorName }: { mentorName: string }) {
  return (
    <div className="flex flex-col items-center py-6">
      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Request Sent!</h3>
      <p className="text-muted-foreground text-center max-w-sm">
        Your collaboration request has been sent to {mentorName}. They&apos;ll be
        notified and can accept or respond to your request.
      </p>
    </div>
  )
}

/**
 * CollaborationRequestModal allows mentees to request a collaboration
 * with a mentor by selecting a goal and optionally an offer.
 */
export function CollaborationRequestModal({
  isOpen,
  onClose,
  mentor,
  offers = [],
  selectedGoal: initialGoal,
  selectedOffer: initialOffer,
  onSuccess,
}: CollaborationRequestModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  // State
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoadingGoals, setIsLoadingGoals] = useState(false)
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialGoal?.id || '')
  const [selectedOfferId, setSelectedOfferId] = useState<string>(initialOffer?.id || '')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's goals when modal opens
  useEffect(() => {
    if (isOpen && goals.length === 0 && !initialGoal) {
      fetchGoals()
    }
  }, [isOpen])

  // Set initial goal if provided
  useEffect(() => {
    if (initialGoal) {
      setGoals([initialGoal])
      setSelectedGoalId(initialGoal.id)
    }
  }, [initialGoal])

  // Set initial offer if provided
  useEffect(() => {
    if (initialOffer) {
      setSelectedOfferId(initialOffer.id)
    }
  }, [initialOffer])

  const fetchGoals = async () => {
    setIsLoadingGoals(true)
    try {
      const res = await fetch('/api/goals?status=active,draft&limit=50')
      if (!res.ok) throw new Error('Failed to fetch goals')
      const data = await res.json()
      setGoals(data.data || [])
    } catch (err) {
      console.error('Failed to fetch goals:', err)
    } finally {
      setIsLoadingGoals(false)
    }
  }

  const selectedGoal = goals.find((g) => g.id === selectedGoalId)
  const selectedOffer = offers.find((o) => o.id === selectedOfferId)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset after animation
      setTimeout(() => {
        if (!initialGoal) setSelectedGoalId('')
        if (!initialOffer) setSelectedOfferId('')
        setMessage('')
        setIsSuccess(false)
        setError(null)
      }, 200)
      onClose()
    }
  }

  const handleSubmit = async () => {
    if (!selectedGoalId) {
      setError('Please select a goal')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: selectedGoalId,
          mentor_profile_id: mentor.id,
          offer_id: selectedOfferId || null,
          request_message: message || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to send request')
      }

      setIsSuccess(true)
      
      toast({
        title: 'Request sent',
        description: `Your collaboration request has been sent to ${mentor.display_name || 'the mentor'}.`,
      })

      onSuccess?.(data.data.id)

      // Close modal after showing success
      setTimeout(() => {
        onClose()
        router.push(`/dashboard/collaborations/${data.data.id}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {isSuccess ? (
          <SuccessState mentorName={mentor.display_name || 'the mentor'} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request Collaboration</DialogTitle>
              <DialogDescription>
                Send a collaboration request to work with this mentor on your goal.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Mentor info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-12 w-12">
                  {mentor.avatar_url && (
                    <AvatarImage src={mentor.avatar_url} alt={mentor.display_name || ''} />
                  )}
                  <AvatarFallback>{getInitials(mentor.display_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{mentor.display_name || 'Unknown Mentor'}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {mentor.handle ? `@${mentor.handle}` : 'Mentor'}
                  </p>
                </div>
              </div>

              {/* Goal selection */}
              <div className="space-y-2">
                <Label htmlFor="goal">Select a goal *</Label>
                {isLoadingGoals ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading your goals...
                  </div>
                ) : goals.length === 0 ? (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    You don&apos;t have any active goals yet.{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => {
                        onClose()
                        router.push('/dashboard/mentee/goals/new')
                      }}
                    >
                      Create a goal first
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedGoalId} onValueChange={setSelectedGoalId} disabled={!!initialGoal}>
                    <SelectTrigger id="goal">
                      <SelectValue placeholder="Choose a goal..." />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{goal.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Selected goal preview */}
              {selectedGoal && (
                <div className="bg-primary/5 rounded-lg p-3 border-l-2 border-primary">
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{selectedGoal.title}</p>
                      {selectedGoal.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {selectedGoal.description}
                        </p>
                      )}
                      {selectedGoal.category && (
                        <Badge variant="outline" className="text-xs mt-2">
                          {selectedGoal.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Offer selection */}
              {offers.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="offer">Select an offering (optional)</Label>
                  <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
                    <SelectTrigger id="offer">
                      <SelectValue placeholder="Choose an offering..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">General Request</SelectItem>
                      {offers.map((offer) => (
                        <SelectItem key={offer.id} value={offer.id}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{offer.title}</span>
                            <span className="text-muted-foreground">
                              ({formatPrice(offer.price_cents, offer.currency)})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selected offer details */}
              {selectedOffer && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={cn('text-xs', typeColors[selectedOffer.type])}>
                      {typeLabels[selectedOffer.type]}
                    </Badge>
                    <span className="font-semibold text-sm">
                      {formatPrice(selectedOffer.price_cents, selectedOffer.currency)}
                    </span>
                  </div>
                  <p className="font-medium text-sm">{selectedOffer.title}</p>
                  {selectedOffer.description && (
                    <p className="text-xs text-muted-foreground">{selectedOffer.description}</p>
                  )}
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
                <Label htmlFor="message">Your message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Introduce yourself and explain why you'd like to work with this mentor..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/2000
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onClose()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedGoalId || goals.length === 0}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Request
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
