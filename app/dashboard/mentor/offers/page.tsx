'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OffersList } from '@/components/mentor/offers/OffersList'
import Link from 'next/link'

export default function MentorOffersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href="/dashboard/mentor">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Consultation Offers</h1>
        <p className="text-muted-foreground">
          Define what you offer to mentees - free collaborations or paid consultations.
        </p>
      </div>

      {/* Offers List */}
      <OffersList
        fetchOnMount={true}
        onSetupPayments={() => {
          // TODO: Navigate to payment setup when implemented
          alert('Payment setup will be available in a future update.')
        }}
      />
    </div>
  )
}
