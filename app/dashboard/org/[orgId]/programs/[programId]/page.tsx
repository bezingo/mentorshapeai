import { redirect, notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getCurrentProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { requireOrgMember } from '@/lib/org/access'
import { ProgramAdminClient } from '@/components/org/ProgramAdminClient'

type PageProps = { params: Promise<{ orgId: string; programId: string }> }

export default async function ProgramDetailPage({ params }: PageProps) {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const profile = await getCurrentProfile()
  if (!profile) {
    notFound()
  }

  const { orgId, programId } = await params
  const supabase = createServiceClient()

  const membership = await requireOrgMember(supabase, orgId, profile.id)
  if (!membership) {
    notFound()
  }

  const { data: program } = await supabase
    .from('programs')
    .select('id, name, org_id')
    .eq('id', programId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (!program) {
    notFound()
  }

  return (
    <ProgramAdminClient
      orgId={orgId}
      programId={programId}
      programName={program.name}
      isAdmin={membership.role === 'admin'}
    />
  )
}
