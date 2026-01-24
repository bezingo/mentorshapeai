'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  User,
  Globe,
  Bell,
  CreditCard,
  Receipt,
  Wallet,
  Lock,
  Shield,
  MonitorSmartphone,
  Trash2,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
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
      {
        title: 'Edit Profile',
        href: '/dashboard/profile',
        icon: User,
      },
      {
        title: 'Language',
        href: '/dashboard/profile/language',
        icon: Globe,
        disabled: true,
      },
      {
        title: 'Notifications',
        href: '/dashboard/profile/notifications',
        icon: Bell,
        disabled: true,
      },
    ],
  },
  {
    title: 'Bank',
    items: [
      {
        title: 'Payments',
        href: '/dashboard/profile/payments',
        icon: CreditCard,
        disabled: true,
      },
      {
        title: 'Taxes',
        href: '/dashboard/profile/taxes',
        icon: Receipt,
        disabled: true,
      },
      {
        title: 'Transactions',
        href: '/dashboard/profile/transactions',
        icon: Wallet,
        disabled: true,
      },
    ],
  },
  {
    title: 'Secure',
    items: [
      {
        title: 'Password',
        href: '/dashboard/profile/password',
        icon: Lock,
        disabled: true,
      },
      {
        title: 'Access',
        href: '/dashboard/profile/access',
        icon: Shield,
        disabled: true,
      },
      {
        title: 'Focuses',
        href: '/dashboard/profile/focuses',
        icon: MonitorSmartphone,
        disabled: true,
      },
      {
        title: 'Delete account',
        href: '/dashboard/profile/delete',
        icon: Trash2,
        disabled: true,
      },
    ],
  },
]

interface ProfileNavSidebarProps {
  className?: string
}

export function ProfileNavSidebar({ className }: ProfileNavSidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-20 left-4 z-40">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-background"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          <span className="sr-only">Toggle profile navigation</span>
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-[64px] left-0 lg:left-64 z-30 h-[calc(100vh-64px)] w-60 border-r bg-background transition-transform lg:relative lg:top-0 lg:left-0 lg:h-auto lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        <nav className="flex flex-col gap-1 p-4">
          {navSections.map((section, sectionIndex) => (
            <div key={section.title || sectionIndex}>
              {section.title && (
                <p className="mb-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/50 cursor-not-allowed'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                )
              })}
              {sectionIndex < navSections.length - 1 && <Separator className="my-3" />}
            </div>
          ))}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
