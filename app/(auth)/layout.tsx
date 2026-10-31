'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useI18n } from '@/lib/i18n'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { dir } = useI18n()

  return (
    <div 
      className="min-h-screen flex flex-col bg-ms-surface-100"
      dir={dir}
    >
      {/* Header with logo and language toggle */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-ms-ember text-ms-on-ember font-semibold text-base">
            M
          </span>
          <span className="text-ms-ink font-semibold text-lg tracking-tight hidden sm:block">
            mentorshape
          </span>
        </Link>
        <LanguageToggle />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-ms-ink-subtle text-sm">
        <p>© {new Date().getFullYear()} Mentorshape. All rights reserved.</p>
      </footer>
    </div>
  )
}
