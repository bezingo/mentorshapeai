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

type NavRole = 'mentor' | 'mentee' | 'counselor'

type IconComponent = React.ComponentType<{ className?: string }>

interface NavItem {
  title: string
  href: string
  icon: IconComponent
  roles?: NavRole[]
  indent?: boolean
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: RiDashboardLine },
  { title: 'My Goals', href: '/dashboard/mentee/goals', icon: RiFlagLine, roles: ['mentee'] },
  { title: 'Collaborations', href: '/dashboard/collaborations', icon: RiGroupLine },
  { title: 'Focuses', href: '/dashboard/focuses', icon: RiCalendarLine },
  { title: 'Mentor Dashboard', href: '/dashboard/mentor', icon: RiUserStarLine, roles: ['mentor'] },
  { title: 'Availability', href: '/dashboard/mentor/availability', icon: RiTimeLine, roles: ['mentor'], indent: true },
  { title: 'Offers', href: '/dashboard/mentor/offers', icon: RiGiftLine, roles: ['mentor'], indent: true },
  { title: 'Counselor', href: '/dashboard/counselor', icon: RiGraduationCapLine, roles: ['counselor'] },
  { title: 'Settings', href: '/dashboard/settings', icon: RiSettings3Line },
]

// Tight, non-bouncy layout spring — the BoardUI reflow recipe.
const ACTIVE_PILL_SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 } as const

interface DashboardSidebarProps {
  roles?: NavRole[]
}

export function DashboardSidebar({ roles }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // When roles are unknown (not passed), show role-agnostic items only
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
      {/* Mobile menu button */}
      <div className="fixed top-3.5 left-4 z-50 lg:hidden">
        <button
          type="button"
          aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex size-9 cursor-pointer items-center justify-center rounded-2lg border border-border-button-default bg-background-primary-default text-foreground-icon-secondary shadow-xs transition-colors duration-150 hover:bg-background-primary-hover active:bg-background-primary-active"
        >
          {isMobileOpen ? <RiCloseLine className="size-5" aria-hidden /> : <RiMenuLine className="size-5" aria-hidden />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 w-64 p-3 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col rounded-3xl border border-border-button-default bg-background-primary-default shadow-sidebar">
          <div className="flex h-16 items-center px-5">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-2lg bg-button-primary text-[15px] font-semibold text-white shadow-xs">
                M
              </span>
              <span className="text-headline-semibold text-text-primary">Mentorshape</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive = item.href === activeHref

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cx(
                    'relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-body-medium transition-colors duration-150',
                    isActive
                      ? 'text-text-primary'
                      : 'text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary active:bg-background-secondary-active',
                    item.indent && 'ml-4'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="dashboard-sidebar-active"
                      transition={ACTIVE_PILL_SPRING}
                      className="absolute inset-0 rounded-xl bg-background-secondary-default"
                      aria-hidden
                    />
                  )}
                  <Icon
                    className={cx(
                      'relative size-[18px] shrink-0',
                      isActive ? 'text-foreground-icon-primary' : 'text-foreground-icon-secondary'
                    )}
                  />
                  <span className="relative">{item.title}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-separator-border px-5 py-4">
            <p className="text-caption-1-medium text-text-tertiary">School pilot MVP</p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 transition-opacity duration-300 ease-out lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
