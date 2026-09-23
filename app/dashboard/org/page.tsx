import { OrgHubClient } from '@/components/org/OrgHubClient'

export default function OrganizationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organizations</h1>
        <p className="text-muted-foreground">
          Create or join a mentorship program for your school or company.
        </p>
      </div>
      <OrgHubClient />
    </div>
  )
}
