import { ReactNode } from 'react'
import { ProfileNavSidebar } from '@/components/profile/profile-nav-sidebar'

export function ProfileSubpageShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      <div className="hidden lg:block">
        <ProfileNavSidebar />
      </div>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
      <div className="lg:hidden">
        <ProfileNavSidebar />
      </div>
    </div>
  )
}
