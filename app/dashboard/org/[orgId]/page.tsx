import { redirect, notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getCurrentProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { requireOrgMember } from '@/lib/org/access'
import { OrgAdminClient } from '@/components/org/OrgAdminClient'

type PageProps = { params: Promise<{ orgId: string }> }

export default async function OrganizationDetailPage({ params }: PageProps) {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const profile = await getCurrentProfile()
  if (!profile) {
    notFound()
  }

  const { orgId } = await params
  const supabase = createServiceClient()

  const membership = await requireOrgMember(supabase, orgId, profile.id)
  if (!membership) {
    notFound()
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, invite_code')
    .eq('id', orgId)
    .single()

  if (!org) {
    notFound()
  }

  return (
    <OrgAdminClient
      orgId={orgId}
      orgName={org.name}
      isAdmin={membership.role === 'admin'}
      inviteCode={org.invite_code}
    />
  )
}
