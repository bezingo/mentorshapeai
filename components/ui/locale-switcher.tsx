'use client'

import { useI18n, LOCALE_NAMES, SUPPORTED_LOCALES } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'
import type { Locale } from '@/lib/i18n/config'

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{LOCALE_NAMES[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((loc: Locale) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc)}
            className={locale === loc ? 'bg-muted' : ''}
          >
            {LOCALE_NAMES[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
