'use client'

import { useState } from 'react'
import {
  MoreVertical,
  Pencil,
  Trash2,
  Clock,
  DollarSign,
  Users,
  Package,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

/** Mentor offer type definition */
export interface MentorOffer {
  id: string
  mentor_profile_id: string
  type: 'free_collab' | 'paid_consult' | 'digital_product'
  title: string
  description: string | null
  price_cents: number | null
  currency: string
  duration_minutes: number | null
  is_active: boolean
  payment_required: boolean
  sort_order: number
}

interface OfferCardProps {
  /** The offer to display */
  offer: MentorOffer
  /** Callback when edit is clicked */
  onEdit: (offer: MentorOffer) => void
  /** Callback when delete is confirmed */
  onDelete: (offerId: string) => Promise<void>
  /** Callback when toggle is clicked */
  onToggle: (offerId: string) => Promise<void>
  /** Callback when move up is clicked */
  onMoveUp?: (offerId: string) => void
  /** Callback when move down is clicked */
  onMoveDown?: (offerId: string) => void
  /** Whether this is the first item (disable move up) */
  isFirst?: boolean
  /** Whether this is the last item (disable move down) */
  isLast?: boolean
  /** Custom class names */
  className?: string
}

/** Type label mapping */
const typeLabels: Record<MentorOffer['type'], string> = {
  free_collab: 'Free Collaboration',
  paid_consult: 'Paid Consultation',
  digital_product: 'Digital Product',
}

/** Type icon mapping */
const typeIcons: Record<MentorOffer['type'], React.ElementType> = {
  free_collab: Users,
  paid_consult: DollarSign,
  digital_product: Package,
}

/** Type variant mapping for badges */
const typeVariants: Record<MentorOffer['type'], 'default' | 'secondary' | 'outline'> = {
  free_collab: 'secondary',
  paid_consult: 'default',
  digital_product: 'outline',
}

/**
 * Format price from cents to display string
 */
function formatPrice(priceCents: number | null, currency: string): string {
  if (priceCents === null) return 'Free'
  
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
  
  return `${hours} hr ${remainingMinutes} min`
}

/**
 * Single offer display card with title, price, duration, edit/delete actions.
 * Includes toggle for active/inactive status and payment required indicator.
 */
export function OfferCard({
  offer,
  onEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  className,
}: OfferCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const TypeIcon = typeIcons[offer.type]

  const handleToggle = async () => {
    setIsToggling(true)
    try {
      await onToggle(offer.id)
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(offer.id)
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card
        className={cn(
          'transition-all duration-200',
          !offer.is_active && 'opacity-60',
          className
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Reorder buttons */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onMoveUp?.(offer.id)}
                disabled={isFirst || !onMoveUp}
                className="h-6 w-6"
                aria-label="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onMoveDown?.(offer.id)}
                disabled={isLast || !onMoveDown}
                className="h-6 w-6"
                aria-label="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-base truncate">{offer.title}</h3>
                    {!offer.is_active && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  
                  {/* Type badge and metadata */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={typeVariants[offer.type]} className="text-xs">
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {typeLabels[offer.type]}
                    </Badge>
                    
                    {offer.type !== 'free_collab' && offer.price_cents !== null && (
                      <span className="text-sm font-medium text-foreground">
                        {formatPrice(offer.price_cents, offer.currency)}
                      </span>
                    )}
                    
                    {offer.duration_minutes !== null && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDuration(offer.duration_minutes)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(offer)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleToggle}
                      disabled={isToggling}
                    >
                      {offer.is_active ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Description */}
              {offer.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {offer.description}
                </p>
              )}

              {/* Payment required warning */}
              {offer.payment_required && offer.type === 'paid_consult' && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-2">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Payment setup required to receive bookings</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{offer.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
