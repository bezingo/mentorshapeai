'use client'

import { PricingTable } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'

export function PricingTableSection() {
  return (
    <Card className="p-4 md:p-8 overflow-hidden">
      <PricingTable />
    </Card>
  )
}
