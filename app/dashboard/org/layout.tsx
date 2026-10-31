'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Users, Mail, BadgeCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard/org/workspace', icon: Building2, label: { en: 'Workspace', ar: 'مساحة العمل' } },
  { href: '/dashboard/org/invites', icon: Mail, label: { en: 'Invites', ar: 'الدعوات' } },
  { href: '/dashboard/org/affiliations', icon: BadgeCheck, label: { en: 'Affiliations', ar: 'الانتماءات' } },
  { href: '/dashboard/counselor', icon: Users, label: { en: 'Members', ar: 'الأعضاء' } },
]

export default function OrgLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { locale } = useI18n()
  const isArabic = locale === 'ar'

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b border-ms-line pb-4 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          const label = isArabic ? item.label.ar : item.label.en

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-ms-ember text-ms-on-ember'
                  : 'text-ms-ink-muted hover:text-ms-ink hover:bg-ms-surface-200'
              )}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
