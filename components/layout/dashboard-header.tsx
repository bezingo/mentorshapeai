'use client'

import { LanguageToggle } from '@/components/ui/language-toggle'
import { UserMenu } from '@/components/auth/UserMenu'
import { ThemeToggle } from '@/components/application/theme/theme-toggle'
import { useI18n } from '@/lib/i18n'
import { cx } from '@/utils/cx'

export function DashboardHeader() {
  const { locale } = useI18n()
  const isRTL = locale === 'ar'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-ms-line bg-ms-surface-100/80 px-6 backdrop-blur-md">
      {/* Spacer for mobile menu button */}
      <div className="w-9 lg:hidden" />
      
      {/* Right-aligned controls */}
      <div className={cx(
        'flex flex-1 items-center gap-3',
        isRTL ? 'justify-start' : 'justify-end'
      )}>
        <LanguageToggle />
        <ThemeToggle appearance="segmented" />
        <span className="h-6 w-px bg-ms-line" aria-hidden />
        <UserMenu />
      </div>
    </header>
  )
}
