'use client'

import { Clock, DollarSign, Users, Package, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Mentor offer data from the API */
export interface PublicMentorOffer {
  id: string
  type: 'free_collab' | 'paid_consult' | 'digital_product'
  title: string
  description: string | null
  price_cents: number | null
  currency: string
  duration_minutes: number | null
  sort_order: number
}

interface OffersSectionProps {
  /** List of active offers to display */
  offers: PublicMentorOffer[]
  /** Callback when "Book Now" or "Request" is clicked */
  onSelectOffer: (offer: PublicMentorOffer) => void
  /** Additional CSS classes */
  className?: string
}

/** Type label mapping */
const typeLabels: Record<PublicMentorOffer['type'], string> = {
  free_collab: 'Free',
  paid_consult: 'Paid',
  digital_product: 'Product',
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
 * Single offer card for public display
 */
function OfferCard({
  offer,
  onSelect,
}: {
  offer: PublicMentorOffer
  onSelect: () => void
}) {
  const TypeIcon = typeIcons[offer.type]
  const isFree = offer.type === 'free_collab' || !offer.price_cents

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="p-4 sm:p-5">
          {/* Header with type badge and price */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <Badge className={cn('font-medium', typeColors[offer.type])}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {typeLabels[offer.type]}
            </Badge>
            <div className="text-right">
              <div className="font-semibold text-lg">
                {formatPrice(offer.price_cents, offer.currency)}
              </div>
              {offer.duration_minutes && (
                <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(offer.duration_minutes)}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base mb-2">{offer.title}</h3>

          {/* Description */}
          {offer.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {offer.description}
            </p>
          )}

          {/* CTA Button */}
          <Button
            onClick={onSelect}
            className="w-full"
            variant={isFree ? 'default' : 'outline'}
          >
            {isFree ? 'Request' : 'Book Now'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Empty state when there are no offers
 */
function EmptyState() {
  return (
    <div className="text-center py-8 bg-muted/30 rounded-xl">
      <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-muted-foreground">No offerings available yet</p>
      <p className="text-sm text-muted-foreground/70">
        Check back later for mentorship opportunities
      </p>
    </div>
  )
}

/**
 * Display public consultation offerings with booking CTAs.
 * Shows active offers with price, duration, and "Request" or "Book Now" buttons.
 */
export function OffersSection({
  offers,
  onSelectOffer,
  className,
}: OffersSectionProps) {
  // Sort offers by sort_order
  const sortedOffers = [...offers].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className={cn('space-y-4', className)}>
      <h2 className="text-lg font-semibold">Work With Me</h2>

      {sortedOffers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onSelect={() => onSelectOffer(offer)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
