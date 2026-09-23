import { createServiceClient } from '@/lib/supabase/service'

export type OrgProgramSummary = {
  id: string
  org_id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
}

export async function listOrgPrograms(
  profileId: string | null | undefined
): Promise<{ programs: OrgProgramSummary[] }> {
  if (!profileId) {
    return { programs: [] }
  }

  const supabase = createServiceClient()

  const { data: memberships, error: memberError } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('profile_id', profileId)

  if (memberError || !memberships?.length) {
    return { programs: [] }
  }

  const orgIds = memberships.map((m) => m.org_id as string)

  const { data: programs, error: programError } = await supabase
    .from('programs')
    .select('id, org_id, name, description, start_date, end_date')
    .in('org_id', orgIds)
    .order('start_date', { ascending: false })

  if (programError) {
    return { programs: [] }
  }

  return { programs: (programs ?? []) as OrgProgramSummary[] }
}
