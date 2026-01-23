'use client'

import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
      <div className="flex flex-1 items-center justify-end gap-4">
        {/* Role toggle will go here */}
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

