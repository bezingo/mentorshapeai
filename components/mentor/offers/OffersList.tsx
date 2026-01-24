'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Package, Info, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { OfferCard, type MentorOffer } from './OfferCard'
import { OfferModal } from './OfferModal'
import { PaymentRequiredBanner } from './PaymentRequiredBanner'

interface OffersListProps {
  /** Initial offers to display (can be loaded externally) */
  initialOffers?: MentorOffer[]
  /** Whether to fetch offers on mount */
  fetchOnMount?: boolean
  /** Callback when offers change (for parent sync) */
  onOffersChange?: (offers: MentorOffer[]) => void
  /** Callback for payment setup CTA */
  onSetupPayments?: () => void
  /** Custom class names */
  className?: string
}

/**
 * List container for mentor offers with add button, reordering via up/down buttons,
 * and payment required banner for paid offers.
 */
export function OffersList({
  initialOffers = [],
  fetchOnMount = true,
  onOffersChange,
  onSetupPayments,
  className,
}: OffersListProps) {
  // State
  const [offers, setOffers] = useState<MentorOffer[]>(initialOffers)
  const [isLoading, setIsLoading] = useState(fetchOnMount && initialOffers.length === 0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<MentorOffer | null>(null)

  // Check if any offer requires payment setup
  const hasPaymentRequiredOffers = offers.some(
    (offer) => offer.payment_required && offer.type === 'paid_consult' && offer.is_active
  )

  // Fetch offers on mount
  useEffect(() => {
    if (fetchOnMount && initialOffers.length === 0) {
      fetchOffers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync with parent when offers change
  useEffect(() => {
    onOffersChange?.(offers)
  }, [offers, onOffersChange])

  // Fetch offers from API
  const fetchOffers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/mentor/offers')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch offers')
      }

      setOffers(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch offers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Create a new offer
  const handleCreate = useCallback(
    async (data: Omit<MentorOffer, 'id' | 'mentor_profile_id' | 'payment_required' | 'sort_order'>) => {
      setError(null)

      try {
        const response = await fetch('/api/mentor/offers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to create offer')
        }

        setOffers((prev) => [...prev, result.data])
        setModalOpen(false)
        setEditingOffer(null)
      } catch (err) {
        throw err // Re-throw to let modal handle error state
      }
    },
    []
  )

  // Update an existing offer
  const handleUpdate = useCallback(
    async (data: Omit<MentorOffer, 'id' | 'mentor_profile_id' | 'payment_required' | 'sort_order'>) => {
      if (!editingOffer) return
      setError(null)

      try {
        const response = await fetch(`/api/mentor/offers/${editingOffer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to update offer')
        }

        setOffers((prev) =>
          prev.map((offer) => (offer.id === editingOffer.id ? result.data : offer))
        )
        setModalOpen(false)
        setEditingOffer(null)
      } catch (err) {
        throw err // Re-throw to let modal handle error state
      }
    },
    [editingOffer]
  )

  // Save handler for modal (create or update)
  const handleSave = useCallback(
    async (data: Omit<MentorOffer, 'id' | 'mentor_profile_id' | 'payment_required' | 'sort_order'>) => {
      setIsSaving(true)
      try {
        if (editingOffer) {
          await handleUpdate(data)
        } else {
          await handleCreate(data)
        }
      } finally {
        setIsSaving(false)
      }
    },
    [editingOffer, handleCreate, handleUpdate]
  )

  // Delete an offer
  const handleDelete = useCallback(async (offerId: string) => {
    setError(null)

    try {
      const response = await fetch(`/api/mentor/offers/${offerId}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to delete offer')
      }

      setOffers((prev) => prev.filter((offer) => offer.id !== offerId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete offer')
      throw err
    }
  }, [])

  // Toggle offer active status
  const handleToggle = useCallback(async (offerId: string) => {
    setError(null)

    try {
      const response = await fetch(`/api/mentor/offers/${offerId}/toggle`, {
        method: 'PATCH',
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to toggle offer')
      }

      setOffers((prev) =>
        prev.map((offer) => (offer.id === offerId ? result.data : offer))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle offer')
      throw err
    }
  }, [])

  // Move offer up in sort order
  const handleMoveUp = useCallback(async (offerId: string) => {
    const index = offers.findIndex((o) => o.id === offerId)
    if (index <= 0) return

    const newOffers = [...offers]
    const temp = newOffers[index]
    newOffers[index] = newOffers[index - 1]
    newOffers[index - 1] = temp

    // Update sort orders
    const updatedOffers = newOffers.map((offer, idx) => ({
      ...offer,
      sort_order: idx,
    }))

    setOffers(updatedOffers)

    // Persist to server
    try {
      await fetch(`/api/mentor/offers/${offerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: index - 1 }),
      })
      await fetch(`/api/mentor/offers/${offers[index - 1].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: index }),
      })
    } catch (err) {
      // Revert on error
      setOffers(offers)
      setError('Failed to reorder offers')
    }
  }, [offers])

  // Move offer down in sort order
  const handleMoveDown = useCallback(async (offerId: string) => {
    const index = offers.findIndex((o) => o.id === offerId)
    if (index < 0 || index >= offers.length - 1) return

    const newOffers = [...offers]
    const temp = newOffers[index]
    newOffers[index] = newOffers[index + 1]
    newOffers[index + 1] = temp

    // Update sort orders
    const updatedOffers = newOffers.map((offer, idx) => ({
      ...offer,
      sort_order: idx,
    }))

    setOffers(updatedOffers)

    // Persist to server
    try {
      await fetch(`/api/mentor/offers/${offerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: index + 1 }),
      })
      await fetch(`/api/mentor/offers/${offers[index + 1].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: index }),
      })
    } catch (err) {
      // Revert on error
      setOffers(offers)
      setError('Failed to reorder offers')
    }
  }, [offers])

  // Open modal for editing
  const handleEdit = useCallback((offer: MentorOffer) => {
    setEditingOffer(offer)
    setModalOpen(true)
  }, [])

  // Open modal for creating
  const handleAddNew = useCallback(() => {
    setEditingOffer(null)
    setModalOpen(true)
  }, [])

  // Close modal
  const handleCloseModal = useCallback(() => {
    if (!isSaving) {
      setModalOpen(false)
      setEditingOffer(null)
    }
  }, [isSaving])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Consultation Offerings</h2>
          <p className="text-sm text-muted-foreground">
            Define what you offer to mentees
          </p>
        </div>
        <Button type="button" onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Offer
        </Button>
      </div>

      {/* Payment Required Banner */}
      {hasPaymentRequiredOffers && (
        <PaymentRequiredBanner onSetupPayments={onSetupPayments} />
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && offers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted mb-4">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-base mb-1">No offers yet</CardTitle>
            <CardDescription className="text-center max-w-sm mb-4">
              Create your first consultation offering to let mentees know what you can help them with.
            </CardDescription>
            <Button type="button" onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Your First Offer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Offers List */}
      {!isLoading && offers.length > 0 && (
        <div className="space-y-3">
          {/* Info Note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="text-muted-foreground">
              Use the arrows to reorder offers. The order shown here is how they appear on your public profile.
            </div>
          </div>

          {offers.map((offer, index) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              isFirst={index === 0}
              isLast={index === offers.length - 1}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <OfferModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        offer={editingOffer}
        isSaving={isSaving}
      />
    </div>
  )
}
