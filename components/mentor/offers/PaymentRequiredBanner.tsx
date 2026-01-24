'use client'

import { AlertTriangle, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaymentRequiredBannerProps {
  /** Custom class names */
  className?: string
  /** Callback when the setup payments button is clicked */
  onSetupPayments?: () => void
}

/**
 * Banner showing "Setup payments to enable paid consultations" with CTA.
 * Shows only for paid offers without Stripe connected (payment_required=true).
 */
export function PaymentRequiredBanner({
  className,
  onSetupPayments,
}: PaymentRequiredBannerProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl',
        'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
        className
      )}
    >
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Payment setup required
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Connect your payment account to enable paid consultations and receive payments from mentees.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSetupPayments}
        className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
      >
        <CreditCard className="h-4 w-4 mr-1.5" />
        Setup Payments
      </Button>
    </div>
  )
}
