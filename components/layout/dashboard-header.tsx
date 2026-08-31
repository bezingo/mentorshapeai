'use client'

import { UserButton } from '@clerk/nextjs'
import { Separator } from '@/components/ui/separator'
import { LanguageToggle } from '@/components/ui/language-toggle'

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
      <div className="flex flex-1 items-center justify-end gap-4">
        <LanguageToggle />
        <Separator orientation="vertical" className="h-6" />
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8',
            },
          }}
        />
      </div>
    </header>
  )
}

