'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { MentorOffer } from './OfferCard'

/** Offer types for the select dropdown */
const OFFER_TYPES = [
  { value: 'free_collab', label: 'Free Collaboration', description: 'Mentorship without payment' },
  { value: 'paid_consult', label: 'Paid Consultation', description: 'Paid one-on-one sessions' },
  { value: 'digital_product', label: 'Digital Product', description: 'Courses, guides, templates' },
] as const

/** Duration presets in minutes */
const DURATION_PRESETS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
] as const

/** Currency options */
const CURRENCIES = [
  { value: 'usd', label: 'USD ($)' },
  { value: 'eur', label: 'EUR (€)' },
  { value: 'gbp', label: 'GBP (£)' },
] as const

/** Form validation schema */
const offerFormSchema = z.object({
  type: z.enum(['free_collab', 'paid_consult', 'digital_product'], {
    required_error: 'Please select an offer type',
  }),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .nullable()
    .optional()
    .transform(val => val || null),
  price_cents: z
    .number()
    .int()
    .min(0, 'Price cannot be negative')
    .nullable()
    .optional(),
  currency: z.string().length(3, 'Invalid currency').default('usd'),
  duration_minutes: z
    .number()
    .int()
    .min(1, 'Duration must be at least 1 minute')
    .max(480, 'Duration cannot exceed 8 hours')
    .nullable()
    .optional(),
}).superRefine((data, ctx) => {
  // For paid consultations, price and duration are required
  if (data.type === 'paid_consult') {
    if (!data.price_cents || data.price_cents <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Price is required for paid consultations',
        path: ['price_cents'],
      })
    }
    if (!data.duration_minutes || data.duration_minutes <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duration is required for paid consultations',
        path: ['duration_minutes'],
      })
    }
  }
})

type OfferFormData = z.infer<typeof offerFormSchema>

interface OfferModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Callback when form is submitted */
  onSave: (data: Omit<MentorOffer, 'id' | 'mentor_profile_id' | 'payment_required' | 'sort_order'>) => Promise<void>
  /** Existing offer to edit (null for create mode) */
  offer: MentorOffer | null
  /** Whether a save operation is in progress */
  isSaving: boolean
}

/**
 * Modal for creating and editing mentor offers.
 * Handles form validation and submission for all offer types.
 */
export function OfferModal({
  isOpen,
  onClose,
  onSave,
  offer,
  isSaving,
}: OfferModalProps) {
  const isEditing = !!offer

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<OfferFormData>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      type: 'free_collab',
      title: '',
      description: null,
      price_cents: null,
      currency: 'usd',
      duration_minutes: null,
    },
  })

  const selectedType = watch('type')
  const isPaidType = selectedType === 'paid_consult'
  const showDuration = selectedType === 'paid_consult'
  const showPrice = selectedType === 'paid_consult' || selectedType === 'digital_product'

  // Reset form when modal opens or offer changes
  useEffect(() => {
    if (isOpen) {
      if (offer) {
        reset({
          type: offer.type,
          title: offer.title,
          description: offer.description,
          price_cents: offer.price_cents,
          currency: offer.currency,
          duration_minutes: offer.duration_minutes,
        })
      } else {
        reset({
          type: 'free_collab',
          title: '',
          description: null,
          price_cents: null,
          currency: 'usd',
          duration_minutes: null,
        })
      }
    }
  }, [isOpen, offer, reset])

  const onSubmit = async (data: OfferFormData) => {
    await onSave({
      type: data.type,
      title: data.title,
      description: data.description ?? null,
      price_cents: showPrice ? data.price_cents ?? null : null,
      currency: data.currency,
      duration_minutes: showDuration ? data.duration_minutes ?? null : null,
      is_active: offer?.is_active ?? true,
    })
  }

  const handleClose = () => {
    if (!isSaving) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Offer' : 'Create New Offer'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your consultation offering details below.'
              : 'Define a new consultation offering for your mentees.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Offer Type */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Offer Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedType}
              onValueChange={(value: 'free_collab' | 'paid_consult' | 'digital_product') =>
                setValue('type', value, { shouldValidate: true })
              }
            >
              <SelectTrigger
                id="type"
                className={cn(errors.type && 'border-destructive')}
              >
                <SelectValue placeholder="Select offer type" />
              </SelectTrigger>
              <SelectContent>
                {OFFER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {type.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="e.g., Career Strategy Session"
              aria-invalid={!!errors.title}
              autoComplete="off"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe what mentees will get from this offering..."
              rows={3}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Price (for paid_consult and digital_product) */}
          {showPrice && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  Price {isPaidType && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="1"
                  {...register('price_cents', {
                    valueAsNumber: true,
                    setValueAs: (v) => (v === '' || v === null || isNaN(v) ? null : parseInt(v, 10) * 100),
                  })}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '') {
                      setValue('price_cents', null)
                    } else {
                      const numValue = parseFloat(value)
                      if (!isNaN(numValue)) {
                        setValue('price_cents', Math.round(numValue * 100))
                      }
                    }
                  }}
                  value={
                    watch('price_cents') !== null
                      ? (watch('price_cents')! / 100).toString()
                      : ''
                  }
                  placeholder="0.00"
                  aria-invalid={!!errors.price_cents}
                />
                {errors.price_cents && (
                  <p className="text-xs text-destructive">{errors.price_cents.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={watch('currency')}
                  onValueChange={(value) => setValue('currency', value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Duration (for paid_consult) */}
          {showDuration && (
            <div className="space-y-2">
              <Label htmlFor="duration">
                Duration {isPaidType && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={watch('duration_minutes')?.toString() || ''}
                onValueChange={(value) =>
                  setValue('duration_minutes', value ? parseInt(value, 10) : null, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  id="duration"
                  className={cn(errors.duration_minutes && 'border-destructive')}
                >
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_PRESETS.map((duration) => (
                    <SelectItem key={duration.value} value={duration.value.toString()}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.duration_minutes && (
                <p className="text-xs text-destructive">{errors.duration_minutes.message}</p>
              )}
            </div>
          )}

          {/* Note for paid consultations */}
          {isPaidType && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <p>
                Note: Paid consultations require payment setup. You can configure payments after creating this offer.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Offer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
