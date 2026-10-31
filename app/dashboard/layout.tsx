import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { QueryProvider } from '@/components/providers/query-provider'
import { getCurrentProfile } from '@/lib/auth-helpers'
import { getOrgMembership } from '@/lib/auth/org-access'

// Force dynamic rendering for dashboard pages (they use cookies for auth)
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  // Resolve roles for navigation (profile auto-creates on first login)
  const profile = await getCurrentProfile()
  
  // Redirect to onboarding if not completed
  if (profile && profile.onboarding_state !== 'completed') {
    redirect('/onboarding')
  }
  
  const orgMembership = profile ? await getOrgMembership(profile.id) : null

  const roles: ('mentor' | 'mentee' | 'counselor')[] = []
  if (profile?.is_mentee) roles.push('mentee')
  if (profile?.is_mentor) roles.push('mentor')
  if (orgMembership?.role === 'admin') roles.push('counselor')

  return (
    <QueryProvider>
      <div className="flex min-h-screen bg-ms-surface-100">
        {/* Desktop sidebar - 248px wide per design system */}
        <DashboardSidebar roles={roles} />
        
        {/* Main content area - offset for sidebar on desktop */}
        <div className="min-w-0 flex-1 lg:ps-[260px]">
          <DashboardHeader />
          {/* pb-24 on mobile for bottom nav clearance */}
          <main className="p-4 pb-24 lg:p-6 lg:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </div>
    </QueryProvider>
  )
}





