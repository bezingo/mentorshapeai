'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  RiCalendarLine,
  RiDashboardLine,
  RiFlagLine,
  RiGroupLine,
  RiUserLine,
} from '@remixicon/react'
import { cx } from '@/utils/cx'
import { useI18n } from '@/lib/i18n'

type IconComponent = React.ComponentType<{ className?: string }>

interface NavItem {
  titleKey: keyof typeof import('@/lib/i18n/locales/en').en.nav
  href: string
  icon: IconComponent
  isCenter?: boolean
}

const mobileNavItems: NavItem[] = [
  { titleKey: 'home', href: '/dashboard', icon: RiDashboardLine },
  { titleKey: 'goals', href: '/dashboard/mentee/goals', icon: RiFlagLine },
  { titleKey: 'sessions', href: '/dashboard/focuses', icon: RiCalendarLine, isCenter: true },
  { titleKey: 'collaborations', href: '/dashboard/collaborations', icon: RiGroupLine },
  { titleKey: 'profile', href: '/dashboard/profile', icon: RiUserLine },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      {/* Glass backdrop */}
      <div className="absolute inset-0 bg-ms-surface-000/90 backdrop-blur-md border-t border-ms-line" />
      
      {/* Safe area for iOS */}
      <div className="relative flex items-center justify-around px-2 pb-safe pt-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const title = t.nav[item.titleKey]

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className="relative -mt-4 flex flex-col items-center"
              >
                <span
                  className={cx(
                    'flex size-14 items-center justify-center rounded-full shadow-lg transition-colors duration-150',
                    isActive
                      ? 'bg-ms-ember text-ms-on-ember'
                      : 'bg-ms-action text-ms-on-action hover:bg-ms-midnight-700'
                  )}
                >
                  <Icon className="size-6" aria-hidden />
                </span>
                <span
                  className={cx(
                    'mt-1 text-[11px] font-medium',
                    isActive ? 'text-ms-ember-text' : 'text-ms-ink-muted'
                  )}
                >
                  {title}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center gap-1 px-3 py-2"
            >
              <Icon
                className={cx(
                  'size-6 transition-colors duration-150',
                  isActive ? 'text-ms-ink' : 'text-ms-ink-subtle'
                )}
                aria-hidden
              />
              <span
                className={cx(
                  'text-[11px] font-medium transition-colors duration-150',
                  isActive ? 'text-ms-ink' : 'text-ms-ink-subtle'
                )}
              >
                {title}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
