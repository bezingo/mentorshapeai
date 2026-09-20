'use client'

import { useMemo, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

function PaymentForm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePay = async () => {
    if (!stripe || !elements) return

    setIsSubmitting(true)
    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    setIsSubmitting(false)

    if (result.error) {
      onError(result.error.message ?? 'Payment failed')
      return
    }

    if (result.paymentIntent?.status === 'succeeded') {
      onSuccess()
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <Button className="w-full" onClick={handlePay} disabled={!stripe || isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Pay now
      </Button>
    </div>
  )
}

export function StripePaymentModal({
  open,
  onOpenChange,
  clientSecret,
  publishableKey,
  title = 'Complete payment',
  description = 'Enter your card details to confirm this booking.',
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientSecret: string | null
  publishableKey: string | null
  title?: string
  description?: string
  onSuccess: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null
    return loadStripe(publishableKey)
  }, [publishableKey])

  const canRender = open && clientSecret && stripePromise

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {canRender ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              onSuccess={() => {
                setError(null)
                onSuccess()
                onOpenChange(false)
              }}
              onError={(message) => setError(message)}
            />
          </Elements>
        ) : (
          <p className="text-sm text-muted-foreground">
            Payment is not available. Check Stripe configuration.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
