'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Target, 
  Users, 
  Calendar, 
  Settings,
  Building2,
  Menu,
  X,
  Clock,
  Package,
  GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('mentor' | 'mentee')[]
  indent?: boolean
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'My Goals',
    href: '/dashboard/mentee/goals',
    icon: Target,
    roles: ['mentee'],
  },
  {
    title: 'Collaborations',
    href: '/dashboard/collaborations',
    icon: Users,
  },
  {
    title: 'Focuses',
    href: '/dashboard/focuses',
    icon: Calendar,
  },
  {
    title: 'Mentor Dashboard',
    href: '/dashboard/mentor',
    icon: Users,
    roles: ['mentor'],
  },
  {
    title: 'Availability',
    href: '/dashboard/mentor/availability',
    icon: Clock,
    roles: ['mentor'],
    indent: true,
  },
  {
    title: 'Offers',
    href: '/dashboard/mentor/offers',
    icon: Package,
    roles: ['mentor'],
    indent: true,
  },
  {
    title: 'Organizations',
    href: '/dashboard/org',
    icon: Building2,
  },
  {
    title: 'Counselor',
    href: '/dashboard/counselor',
    icon: GraduationCap,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r bg-background transition-transform lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/dashboard" className="text-xl font-bold">
              Mentorshape
            </Link>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                    item.indent && 'ml-4'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              )
            })}
          </nav>
          <Separator />
          <div className="p-4">
            {/* Role toggle will go here */}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}

