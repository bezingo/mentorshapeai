'use client'

import { ReactNode } from 'react'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'

interface MarketingLayoutProps {
  children: ReactNode
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
