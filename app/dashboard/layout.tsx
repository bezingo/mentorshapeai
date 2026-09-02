import { ReactNode } from 'react'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { QueryProvider } from '@/components/providers/query-provider'

// Force dynamic rendering for dashboard pages (they use cookies for auth)
export const dynamic = 'force-dynamic'

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <QueryProvider>
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <div className="flex-1 lg:pl-64">
          <DashboardHeader />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </QueryProvider>
  )
}





