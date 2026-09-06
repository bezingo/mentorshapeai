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
        <h1 className="text-3xl font-bold">Mentorship Offerings</h1>
        <p className="text-muted-foreground">
          Define collaboration offerings for mentees. Describe what you can help with and how you like to work together.
        </p>
      </div>

      {/* Offers List */}
      <OffersList
        fetchOnMount={true}
        onSetupPayments={() => {
          // School-pilot mode: payments are disabled
          // This callback is kept for interface compatibility but should not be triggered
        }}
      />
    </div>
  )
}
