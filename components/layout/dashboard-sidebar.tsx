'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'motion/react'
import {
  RiCalendarLine,
  RiCloseLine,
  RiDashboardLine,
  RiFlagLine,
  RiGiftLine,
  RiGraduationCapLine,
  RiGroupLine,
  RiMenuLine,
  RiSettings3Line,
  RiTimeLine,
  RiUserStarLine,
} from '@remixicon/react'
import { cx } from '@/utils/cx'
import { useI18n } from '@/lib/i18n'

type NavRole = 'mentor' | 'mentee' | 'counselor'

type IconComponent = React.ComponentType<{ className?: string }>

interface NavItem {
  titleKey: keyof typeof import('@/lib/i18n/locales/en').en.nav
  href: string
  icon: IconComponent
  roles?: NavRole[]
  indent?: boolean
}

const navItems: NavItem[] = [
  { titleKey: 'dashboard', href: '/dashboard', icon: RiDashboardLine },
  { titleKey: 'myGoals', href: '/dashboard/mentee/goals', icon: RiFlagLine, roles: ['mentee'] },
  { titleKey: 'collaborations', href: '/dashboard/collaborations', icon: RiGroupLine },
  { titleKey: 'sessions', href: '/dashboard/focuses', icon: RiCalendarLine },
  { titleKey: 'mentorDashboard', href: '/dashboard/mentor', icon: RiUserStarLine, roles: ['mentor'] },
  { titleKey: 'availability', href: '/dashboard/mentor/availability', icon: RiTimeLine, roles: ['mentor'], indent: true },
  { titleKey: 'offers', href: '/dashboard/mentor/offers', icon: RiGiftLine, roles: ['mentor'], indent: true },
  { titleKey: 'counselor', href: '/dashboard/counselor', icon: RiGraduationCapLine, roles: ['counselor'] },
  { titleKey: 'settings', href: '/dashboard/settings', icon: RiSettings3Line },
]

const ACTIVE_PILL_SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 } as const

interface DashboardSidebarProps {
  roles?: NavRole[]
}

export function DashboardSidebar({ roles }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { t, locale } = useI18n()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const isRTL = locale === 'ar'

  const userRoles = roles ?? ['mentee']
  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.some((role) => userRoles.includes(role))
  )

  const activeHref = visibleItems.reduce<string | null>((best, item) => {
    const matches = pathname === item.href || pathname.startsWith(item.href + '/')
    if (!matches) return best
    if (!best || item.href.length > best.length) return item.href
    return best
  }, null)

  return (
    <>
      {/* Mobile menu button - positioned based on RTL */}
      <div className={cx(
        'fixed top-3.5 z-50 lg:hidden',
        isRTL ? 'end-4' : 'start-4'
      )}>
        <button
          type="button"
          aria-label={isMobileOpen ? t.nav.closeMenu : t.nav.openMenu}
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex size-9 cursor-pointer items-center justify-center rounded-md border border-ms-line bg-ms-surface-000 text-ms-ink-muted shadow-sm transition-colors duration-150 hover:bg-ms-surface-200 active:bg-ms-surface-200"
        >
          {isMobileOpen ? <RiCloseLine className="size-5" aria-hidden /> : <RiMenuLine className="size-5" aria-hidden />}
        </button>
      </div>

      {/* Sidebar - hidden on mobile unless open */}
      <aside
        className={cx(
          'fixed inset-y-0 z-40 w-[248px] p-3 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          isRTL ? 'end-0' : 'start-0',
          isRTL
            ? (isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0')
            : (isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
        )}
      >
        <div className="flex h-full flex-col rounded-lg bg-ms-midnight shadow-sidebar">
          {/* Logo */}
          <div className="flex h-16 items-center px-5">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              {/* Ascent mark placeholder - two arches with spark */}
              <span className="flex size-8 items-center justify-center rounded-lg bg-ms-ember text-ms-on-ember font-semibold text-[15px]">
                M
              </span>
              <span className="text-ms-on-midnight font-semibold text-[17px] tracking-[-0.01em]">
                mentorshape
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive = item.href === activeHref
              const title = t.nav[item.titleKey]

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cx(
                    'relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[15px] font-medium transition-colors duration-150',
                    isActive
                      ? 'text-ms-on-midnight'
                      : 'text-ms-on-midnight/70 hover:bg-ms-midnight-700 hover:text-ms-on-midnight',
                    item.indent && (isRTL ? 'me-4' : 'ms-4')
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="dashboard-sidebar-active"
                      transition={ACTIVE_PILL_SPRING}
                      className="absolute inset-0 rounded-md bg-ms-midnight-700"
                      aria-hidden
                    />
                  )}
                  <Icon
                    className={cx(
                      'relative size-[18px] shrink-0',
                      isActive ? 'text-ms-ember' : 'text-ms-on-midnight/60'
                    )}
                  />
                  <span className="relative">{title}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-ms-midnight-700 px-5 py-4">
            <p className="text-[13px] leading-[18px] text-ms-on-midnight/50">
              {t.app.pilotLabel}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 transition-opacity duration-300 ease-out lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
