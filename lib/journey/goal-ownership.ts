import { createServiceClient } from '@/lib/supabase/service'

export class GoalOwnershipError extends Error {
  constructor(message = 'Goal not found or not owned by user') {
    super(message)
    this.name = 'GoalOwnershipError'
  }
}

export async function assertGoalOwnedByProfile(goalId: string, profileId: string): Promise<void> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('goals')
    .select('id, profile_id')
    .eq('id', goalId)
    .maybeSingle()

  if (error || !data || data.profile_id !== profileId) {
    throw new GoalOwnershipError()
  }
}

export async function getGoalOwnerId(goalId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('goals').select('profile_id').eq('id', goalId).maybeSingle()
  return data?.profile_id ?? null
}
