'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { LocaleSwitcher } from '@/components/ui/locale-switcher'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface MarketingHeaderProps {
  isAuthenticated?: boolean
}

export function MarketingHeader({ isAuthenticated = false }: MarketingHeaderProps) {
  const { t, locale } = useI18n()
  const isRTL = locale === 'ar'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { href: '/for-schools', label: isRTL ? 'للمدارس' : 'For Schools' },
    { href: '/for-mentors', label: isRTL ? 'للمرشدين' : 'For Mentors' },
    { href: '/pricing', label: isRTL ? 'الأسعار' : 'Pricing' },
  ]

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ms-orange to-orange-600">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <span className="text-xl font-bold">Mentorshape</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ms-ink-muted hover:text-ms-ink transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <LocaleSwitcher />
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button>{isRTL ? 'لوحة التحكم' : 'Dashboard'}</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost">{isRTL ? 'تسجيل الدخول' : 'Sign In'}</Button>
              </Link>
              <Link href="/sign-up">
                <Button className="bg-ms-orange hover:bg-ms-orange/90">
                  {isRTL ? 'ابدأ مجاناً' : 'Get Started'}
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-4 space-y-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block text-sm font-medium text-ms-ink-muted hover:text-ms-ink"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-4 border-t space-y-2">
            <LocaleSwitcher />
            {isAuthenticated ? (
              <Link href="/dashboard" className="block">
                <Button className="w-full">{isRTL ? 'لوحة التحكم' : 'Dashboard'}</Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="block">
                  <Button variant="outline" className="w-full">
                    {isRTL ? 'تسجيل الدخول' : 'Sign In'}
                  </Button>
                </Link>
                <Link href="/sign-up" className="block">
                  <Button className="w-full bg-ms-orange hover:bg-ms-orange/90">
                    {isRTL ? 'ابدأ مجاناً' : 'Get Started'}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
