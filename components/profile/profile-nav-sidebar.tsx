'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import {
  RiBankCardLine,
  RiCloseLine,
  RiComputerLine,
  RiDeleteBinLine,
  RiGlobalLine,
  RiLock2Line,
  RiMenuLine,
  RiNotification3Line,
  RiReceiptLine,
  RiShieldLine,
  RiUserLine,
  RiWallet3Line,
} from '@remixicon/react'
import { cx } from '@/utils/cx'

type IconComponent = React.ComponentType<{ className?: string }>

interface NavItem {
  title: string
  href: string
  icon: IconComponent
  disabled?: boolean
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Profile',
    items: [
      { title: 'Edit Profile', href: '/dashboard/profile', icon: RiUserLine },
      { title: 'Language', href: '/dashboard/profile/language', icon: RiGlobalLine, disabled: true },
      { title: 'Notifications', href: '/dashboard/profile/notifications', icon: RiNotification3Line, disabled: true },
    ],
  },
  {
    title: 'Bank',
    items: [
      { title: 'Payments', href: '/dashboard/profile/payments', icon: RiBankCardLine, disabled: true },
      { title: 'Taxes', href: '/dashboard/profile/taxes', icon: RiReceiptLine, disabled: true },
      { title: 'Transactions', href: '/dashboard/profile/transactions', icon: RiWallet3Line, disabled: true },
    ],
  },
  {
    title: 'Secure',
    items: [
      { title: 'Password', href: '/dashboard/profile/password', icon: RiLock2Line, disabled: true },
      { title: 'Access', href: '/dashboard/profile/access', icon: RiShieldLine, disabled: true },
      { title: 'Focuses', href: '/dashboard/profile/focuses', icon: RiComputerLine, disabled: true },
      { title: 'Delete account', href: '/dashboard/profile/delete', icon: RiDeleteBinLine, disabled: true },
    ],
  },
]

const ACTIVE_PILL_SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 } as const

interface ProfileNavSidebarProps {
  className?: string
}

export function ProfileNavSidebar({ className }: ProfileNavSidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const nav = (
    <nav className="flex flex-col p-2">
      {navSections.map((section, sectionIndex) => (
        <div key={section.title || sectionIndex}>
          {section.title && (
            <p className="mt-2 mb-1 px-3 text-caption-1-medium tracking-wide text-text-tertiary uppercase first:mt-0">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  aria-disabled
                  className="flex cursor-not-allowed items-center gap-2.5 rounded-xl px-3 py-2 text-body-medium text-text-tertiary/60"
                >
                  <Icon className="size-[18px] shrink-0" />
                  {item.title}
                </div>
              )
            }

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
                    : 'text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary active:bg-background-secondary-active'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="profile-nav-active"
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
          {sectionIndex < navSections.length - 1 && (
            <div className="my-2 h-px bg-separator-border" aria-hidden />
          )}
        </div>
      ))}
    </nav>
  )

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-20 left-4 z-40 lg:hidden">
        <button
          type="button"
          aria-label={isMobileOpen ? 'Close profile navigation' : 'Open profile navigation'}
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex size-9 cursor-pointer items-center justify-center rounded-2lg border border-border-button-default bg-background-primary-default text-foreground-icon-secondary shadow-xs transition-colors duration-150 hover:bg-background-primary-hover active:bg-background-primary-active"
        >
          {isMobileOpen ? <RiCloseLine className="size-5" aria-hidden /> : <RiMenuLine className="size-5" aria-hidden />}
        </button>
      </div>

      {/* Mobile drawer */}
      <aside
        className={cx(
          'fixed top-[64px] left-0 z-30 h-[calc(100vh-64px)] w-60 border-r border-separator-border bg-background-primary-default transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {nav}
      </aside>

      {/* Desktop card */}
      <aside
        className={cx(
          'sticky top-20 hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-xs lg:block',
          className
        )}
      >
        {nav}
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
