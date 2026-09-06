import { ReactNode } from 'react'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
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
  // Resolve roles for the sidebar (profile auto-creates on first login)
  const profile = await getCurrentProfile()
  const orgMembership = profile ? await getOrgMembership(profile.id) : null

  const roles: ('mentor' | 'mentee' | 'counselor')[] = []
  if (profile?.is_mentee) roles.push('mentee')
  if (profile?.is_mentor) roles.push('mentor')
  if (orgMembership?.role === 'admin') roles.push('counselor')

  return (
    <QueryProvider>
      <div className="flex min-h-screen">
        <DashboardSidebar roles={roles} />
        <div className="flex-1 lg:pl-64">
          <DashboardHeader />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </QueryProvider>
  )
}





