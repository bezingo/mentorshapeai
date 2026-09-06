'use client'

import { LanguageToggle } from '@/components/ui/language-toggle'
import { UserMenu } from '@/components/auth/UserMenu'
import { ThemeToggle } from '@/components/application/theme/theme-toggle'

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-separator-border bg-background-full/80 px-6 backdrop-blur-md">
      <div className="flex flex-1 items-center justify-end gap-3">
        <LanguageToggle />
        <ThemeToggle appearance="segmented" />
        <span className="h-6 w-px bg-separator-border" aria-hidden />
        <UserMenu />
      </div>
    </header>
  )
}
