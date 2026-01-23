import { createServiceClient } from '@/lib/supabase/service'

/**
 * Goal Versioning Utilities
 * 
 * Functions for creating and managing goal version history.
 * Versions capture snapshots of goal state before changes.
 */

export type ChangeSource = 'user' | 'ai_advisor' | 'ai_shaper' | 'ai_swot' | 'ai_smart'

export interface GoalVersion {
  id: string
  goal_id: string
  version_number: number
  changed_by: ChangeSource
  change_summary: string | null
  title: string | null
  description: string | null
  refined_goal_statement: string | null
  success_definition: string | null
  current_challenges: string | null
  suggested_mentor_questions: string[] | null
  risks_pitfalls: any | null
  swot_analysis: any | null
  smart_framework: any | null
  mentor_notes: string | null
  milestones_snapshot: any[] | null
  created_at: string
}

export interface GoalVersionDiff {
  field: string
  label: string
  before: any
  after: any
  type: 'text' | 'array' | 'json'
}

/**
 * Creates a version snapshot of a goal before making changes.
 * Call this BEFORE updating the goal to capture the current state.
 * 
 * @param goalId - The goal ID to snapshot
 * @param changedBy - Source of the upcoming change
 * @param changeSummary - Human-readable description of what will change
 * @returns The created version record or null on error
 */
export async function createGoalVersion(
  goalId: string,
  changedBy: ChangeSource,
  changeSummary?: string
): Promise<GoalVersion | null> {
  const supabase = createServiceClient()
  
  try {
    // Load current goal state
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single()
    
    if (goalError || !goal) {
      console.error('Failed to load goal for versioning:', goalError)
      return null
    }
    
    // Load current milestones
    const { data: milestones } = await supabase
      .from('goal_milestones')
      .select('id, title, description, target_date, status')
      .eq('goal_id', goalId)
      .order('target_date', { ascending: true })
    
    // Get next version number
    const { data: nextVersion } = await supabase
      .rpc('get_next_goal_version_number', { p_goal_id: goalId })
    
    const versionNumber = nextVersion || 1
    
    // Create version snapshot
    const { data: version, error: insertError } = await supabase
      .from('goal_versions')
      .insert({
        goal_id: goalId,
        version_number: versionNumber,
        changed_by: changedBy,
        change_summary: changeSummary || null,
        title: goal.title,
        description: goal.description,
        refined_goal_statement: goal.refined_goal_statement,
        success_definition: goal.success_definition,
        current_challenges: goal.current_challenges,
        suggested_mentor_questions: goal.suggested_mentor_questions,
        risks_pitfalls: goal.risks_pitfalls,
        swot_analysis: goal.swot_analysis,
        smart_framework: goal.smart_framework,
        mentor_notes: goal.mentor_notes,
        milestones_snapshot: milestones || []
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Failed to create goal version:', insertError)
      return null
    }
    
    return version as GoalVersion
  } catch (error) {
    console.error('Error creating goal version:', error)
    return null
  }
}

/**
 * Gets all versions for a goal, ordered by version number descending (newest first).
 * 
 * @param goalId - The goal ID to get versions for
 * @returns Array of versions or empty array on error
 */
export async function getGoalVersions(goalId: string): Promise<GoalVersion[]> {
  const supabase = createServiceClient()
  
  try {
    const { data: versions, error } = await supabase
      .from('goal_versions')
      .select('*')
      .eq('goal_id', goalId)
      .order('version_number', { ascending: false })
    
    if (error) {
      console.error('Failed to get goal versions:', error)
      return []
    }
    
    return (versions || []) as GoalVersion[]
  } catch (error) {
    console.error('Error getting goal versions:', error)
    return []
  }
}

/**
 * Gets a single version by ID.
 * 
 * @param versionId - The version ID
 * @returns The version or null if not found
 */
export async function getGoalVersion(versionId: string): Promise<GoalVersion | null> {
  const supabase = createServiceClient()
  
  try {
    const { data: version, error } = await supabase
      .from('goal_versions')
      .select('*')
      .eq('id', versionId)
      .single()
    
    if (error) {
      console.error('Failed to get goal version:', error)
      return null
    }
    
    return version as GoalVersion
  } catch (error) {
    console.error('Error getting goal version:', error)
    return null
  }
}

/**
 * Compares two versions and returns the differences.
 * 
 * @param version1 - First version (typically older)
 * @param version2 - Second version (typically newer)
 * @returns Array of differences between the versions
 */
export function getGoalVersionDiff(
  version1: GoalVersion,
  version2: GoalVersion
): GoalVersionDiff[] {
  const diffs: GoalVersionDiff[] = []
  
  const fieldsToCompare: Array<{
    field: keyof GoalVersion
    label: string
    type: 'text' | 'array' | 'json'
  }> = [
    { field: 'title', label: 'Title', type: 'text' },
    { field: 'description', label: 'Description', type: 'text' },
    { field: 'refined_goal_statement', label: 'Refined Goal Statement', type: 'text' },
    { field: 'success_definition', label: 'Success Definition', type: 'text' },
    { field: 'current_challenges', label: 'Current Challenges', type: 'text' },
    { field: 'suggested_mentor_questions', label: 'Mentor Questions', type: 'array' },
    { field: 'risks_pitfalls', label: 'Risks & Mitigations', type: 'json' },
    { field: 'swot_analysis', label: 'SWOT Analysis', type: 'json' },
    { field: 'smart_framework', label: 'SMART Framework', type: 'json' },
    { field: 'mentor_notes', label: 'Mentor Notes', type: 'text' },
    { field: 'milestones_snapshot', label: 'Milestones', type: 'json' }
  ]
  
  for (const { field, label, type } of fieldsToCompare) {
    const before = version1[field]
    const after = version2[field]
    
    // Compare based on type
    let isDifferent = false
    
    if (type === 'text') {
      isDifferent = (before || '') !== (after || '')
    } else if (type === 'array') {
      isDifferent = JSON.stringify(before || []) !== JSON.stringify(after || [])
    } else if (type === 'json') {
      isDifferent = JSON.stringify(before || null) !== JSON.stringify(after || null)
    }
    
    if (isDifferent) {
      diffs.push({
        field,
        label,
        before,
        after,
        type
      })
    }
  }
  
  return diffs
}

/**
 * Gets a formatted change source label for display.
 */
export function getChangeSourceLabel(source: ChangeSource): string {
  const labels: Record<ChangeSource, string> = {
    user: 'Manual Edit',
    ai_advisor: 'AI Advisor',
    ai_shaper: 'AI Goal Shaper',
    ai_swot: 'SWOT Analysis',
    ai_smart: 'SMART Framework'
  }
  return labels[source] || source
}

/**
 * Gets an icon name for the change source.
 */
export function getChangeSourceIcon(source: ChangeSource): string {
  const icons: Record<ChangeSource, string> = {
    user: 'pencil',
    ai_advisor: 'message-circle',
    ai_shaper: 'sparkles',
    ai_swot: 'grid-2x2',
    ai_smart: 'target'
  }
  return icons[source] || 'file-text'
}

/**
 * Restores a goal to a previous version.
 * Creates a new version snapshot first, then applies the old version's data.
 * 
 * @param goalId - The goal ID
 * @param versionId - The version ID to restore to
 * @returns Success boolean
 */
export async function restoreGoalVersion(
  goalId: string,
  versionId: string
): Promise<boolean> {
  const supabase = createServiceClient()
  
  try {
    // Get the version to restore
    const versionToRestore = await getGoalVersion(versionId)
    if (!versionToRestore || versionToRestore.goal_id !== goalId) {
      console.error('Version not found or does not belong to goal')
      return false
    }
    
    // Create a snapshot of current state before restoring
    await createGoalVersion(
      goalId,
      'user',
      `Restored to version ${versionToRestore.version_number}`
    )
    
    // Update goal with restored data
    const { error: updateError } = await supabase
      .from('goals')
      .update({
        title: versionToRestore.title,
        description: versionToRestore.description,
        refined_goal_statement: versionToRestore.refined_goal_statement,
        success_definition: versionToRestore.success_definition,
        current_challenges: versionToRestore.current_challenges,
        suggested_mentor_questions: versionToRestore.suggested_mentor_questions,
        risks_pitfalls: versionToRestore.risks_pitfalls,
        swot_analysis: versionToRestore.swot_analysis,
        smart_framework: versionToRestore.smart_framework,
        mentor_notes: versionToRestore.mentor_notes
      })
      .eq('id', goalId)
    
    if (updateError) {
      console.error('Failed to restore goal:', updateError)
      return false
    }
    
    // Restore milestones if snapshot exists
    if (versionToRestore.milestones_snapshot && versionToRestore.milestones_snapshot.length > 0) {
      // Delete existing milestones
      await supabase
        .from('goal_milestones')
        .delete()
        .eq('goal_id', goalId)
      
      // Insert restored milestones
      const milestonesToInsert = versionToRestore.milestones_snapshot.map((m: any) => ({
        goal_id: goalId,
        title: m.title,
        description: m.description,
        target_date: m.target_date,
        status: m.status || 'pending'
      }))
      
      await supabase
        .from('goal_milestones')
        .insert(milestonesToInsert)
    }
    
    return true
  } catch (error) {
    console.error('Error restoring goal version:', error)
    return false
  }
}
