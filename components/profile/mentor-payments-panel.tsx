'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

interface ConnectStatus {
  account_id: string | null
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  ready_for_payments: boolean
}

export function MentorPaymentsPanel() {
  const searchParams = useSearchParams()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mentor-connect-status'],
    queryFn: async () => {
      const res = await fetch('/api/mentor/connect/status')
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error?.message ?? 'Failed to load payment status')
      }
      const json = await res.json()
      return json.data as ConnectStatus
    },
  })

  useEffect(() => {
    const connect = searchParams.get('connect')
    if (connect === 'return' || connect === 'refresh') {
      refetch()
    }
  }, [searchParams, refetch])

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/mentor/connect/onboard', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Failed to start onboarding')
      }
      return json.data as { onboarding_url: string }
    },
    onSuccess: (result) => {
      window.location.href = result.onboarding_url
    },
  })

  const ready = data?.ready_for_payments

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentor payouts (Stripe Connect)</CardTitle>
        <CardDescription>
          Connect Stripe to receive payments for paid consultations and digital products. Mentorshape
          collects a platform fee on each transaction.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading payment status…
          </div>
        ) : ready ? (
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Payments enabled</p>
              <p className="text-muted-foreground">
                Your Stripe Connect account is ready. Paid offers can accept bookings and purchases.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Complete payment setup</p>
              <p className="text-muted-foreground">
                {data?.details_submitted
                  ? 'Stripe is reviewing your account. You can refresh status or continue onboarding.'
                  : 'You will be redirected to Stripe to verify your identity and add payout details.'}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => onboardMutation.mutate()}
            disabled={onboardMutation.isPending}
          >
            {onboardMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {ready ? 'Update payout details' : 'Enable paid consultations'}
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            Refresh status
          </Button>
        </div>

        {data?.account_id && (
          <p className="text-xs text-muted-foreground">
            Connect account: {data.account_id}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
