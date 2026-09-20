import { shapeGoal, type GoalShapingInput } from './goal-shaper'
import { searchConversationMemory } from './goal-context-builder'
import { createServiceClient } from '@/lib/supabase/service'
import { pipedreamBooking } from '@/lib/integrations/pipedream'
import { notionExport } from '@/lib/integrations/notion'
import { googleDocsExport } from '@/lib/integrations/google-docs'
import { createGoalVersion } from '@/lib/utils/goal-versioning'

/**
 * Tool integration functions for Goal Advisor AI
 * 
 * These functions are called by the AI SDK when the agent
 * decides to use tools during conversation.
 */

/**
 * Refine specific aspects of a goal using LangChain Goal Shaper
 */
export async function refineGoalAspects(
  goalId: string,
  aspects: string[]
): Promise<{
  success: boolean
  message: string
  refinedData?: any
}> {
  try {
    const supabase = createServiceClient()
    
    // Load goal data
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single()
    
    if (goalError || !goal) {
      return {
        success: false,
        message: 'Failed to load goal data'
      }
    }
    
    // Prepare input for goal shaper
    const input: GoalShapingInput = {
      title: goal.title,
      duration_days: goal.duration_days,
      current_challenges: goal.current_challenges || undefined,
      category: goal.category || undefined,
      description: goal.description || undefined,
      existing_success_definition: goal.success_definition || undefined
    }
    
    // Run goal shaper
    const shaped = await shapeGoal(input)
    
    // Create version snapshot before updates
    await createGoalVersion(
      goalId,
      'ai_advisor',
      `AI Advisor refined: ${aspects.join(', ')}`
    )
    
    // Update goal with refined data (only requested aspects)
    const updates: any = {}
    
    if (aspects.includes('statement') || aspects.includes('all')) {
      updates.refined_goal_statement = shaped.refined_goal_statement
    }
    
    if (aspects.includes('success_criteria') || aspects.includes('all')) {
      if (!goal.success_definition) { // Don't overwrite existing
        updates.success_definition = shaped.success_definition
      }
    }
    
    if (aspects.includes('questions') || aspects.includes('all')) {
      updates.suggested_mentor_questions = shaped.suggested_questions_for_mentor
    }
    
    if (aspects.includes('risks') || aspects.includes('all')) {
      updates.risks_pitfalls = shaped.risks_or_pitfalls
    }
    
    // Update goal in database
    if (Object.keys(updates).length > 0) {
      updates.ai_shaped_at = new Date().toISOString()
      
      await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId)
    }
    
    // Create or update milestones if requested
    if (aspects.includes('milestones') || aspects.includes('all')) {
      // Delete existing AI-generated milestones
      await supabase
        .from('goal_milestones')
        .delete()
        .eq('goal_id', goalId)
      
      // Insert new milestones
      const milestonesToInsert = shaped.milestones.map(m => ({
        goal_id: goalId,
        title: m.title,
        description: m.description,
        target_date: new Date(
          new Date(goal.created_at).getTime() + 
          m.relative_day_offset * 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0],
        status: 'pending'
      }))
      
      await supabase
        .from('goal_milestones')
        .insert(milestonesToInsert)
    }
    
    return {
      success: true,
      message: `Successfully refined ${aspects.join(', ')}`,
      refinedData: shaped
    }
  } catch (error) {
    console.error('Error refining goal:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to refine goal'
    }
  }
}

/**
 * Run SWOT or SMART analysis on a goal
 */
export async function analyzeGoal(
  goalId: string,
  type: 'swot' | 'smart'
): Promise<{
  success: boolean
  message: string
  analysis?: any
}> {
  try {
    const supabase = createServiceClient()
    
    // Load goal data
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single()
    
    if (goalError || !goal) {
      return {
        success: false,
        message: 'Failed to load goal data'
      }
    }
    
    // Load milestones for context
    const { data: milestones } = await supabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('target_date', { ascending: true })
    
    if (type === 'swot') {
      return await runSWOTAnalysis(goal, milestones || [], supabase)
    } else {
      return await runSMARTAnalysis(goal, milestones || [], supabase)
    }
  } catch (error) {
    console.error('Error analyzing goal:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to analyze goal'
    }
  }
}

async function runSWOTAnalysis(goal: any, milestones: any[], supabase: any) {
  // Create version snapshot before SWOT analysis
  await createGoalVersion(
    goal.id,
    'ai_swot',
    'SWOT analysis generated'
  )
  
  // For now, use simple logic-based SWOT
  // Can be enhanced with LangChain later
  
  const analysis: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  } = {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: []
  }
  
  // Strengths
  if (goal.success_definition) {
    analysis.strengths.push('Clear success definition established')
  }
  if (milestones.length >= 3) {
    analysis.strengths.push(`${milestones.length} milestones planned`)
  }
  if (goal.refined_goal_statement) {
    analysis.strengths.push('Goal has been refined and clarified')
  }
  
  // Weaknesses
  if (!goal.success_definition) {
    analysis.weaknesses.push('No clear success criteria defined')
  }
  if (milestones.length === 0) {
    analysis.weaknesses.push('No milestones set yet')
  }
  if (!goal.current_challenges) {
    analysis.weaknesses.push('Current challenges not documented')
  }
  
  // Opportunities
  analysis.opportunities.push(`${goal.duration_days} days provides focused timeframe`)
  if (goal.category) {
    analysis.opportunities.push(`${goal.category} category has established best practices`)
  }
  
  // Threats
  if (goal.duration_days === 30) {
    analysis.threats.push('Short timeframe may create pressure')
  }
  if (goal.current_challenges) {
    analysis.threats.push('Documented challenges may require mitigation')
  }
  
  // Save to database
  await supabase
    .from('goals')
    .update({
      swot_analysis: analysis,
      swot_generated_at: new Date().toISOString()
    })
    .eq('id', goal.id)
  
  return {
    success: true,
    message: 'SWOT analysis completed',
    analysis
  }
}

async function runSMARTAnalysis(goal: any, milestones: any[], supabase: any) {
  // Create version snapshot before SMART analysis
  await createGoalVersion(
    goal.id,
    'ai_smart',
    'SMART framework generated'
  )
  
  // Simple logic-based SMART framework
  // Can be enhanced with LangChain later
  
  const analysis = {
    specific: goal.refined_goal_statement || goal.title || 'Goal needs more specificity',
    measurable: goal.success_definition || 'Success criteria not yet defined',
    achievable: `${goal.duration_days}-day timeframe with ${milestones.length} milestones`,
    relevant: goal.category ? `Aligned with ${goal.category} objectives` : 'Category not specified',
    time_bound: `${goal.duration_days} days (${new Date(goal.created_at).toLocaleDateString()} - ${new Date(new Date(goal.created_at).getTime() + goal.duration_days * 24 * 60 * 60 * 1000).toLocaleDateString()})`
  }
  
  // Save to database
  await supabase
    .from('goals')
    .update({
      smart_framework: analysis,
      smart_generated_at: new Date().toISOString()
    })
    .eq('id', goal.id)
  
  return {
    success: true,
    message: 'SMART analysis completed',
    analysis
  }
}

/**
 * Book calendar event via Pipedream
 */
export async function bookCalendar(params: {
  goalId: string
  mentorEmail: string
  datetime: string
  duration: number
}): Promise<{
  success: boolean
  message: string
  bookingUrl?: string
}> {
  try {
    const result = await pipedreamBooking(params)
    return result
  } catch (error) {
    console.error('Error booking calendar:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to book calendar'
    }
  }
}

/**
 * Export goal to Notion
 */
export async function exportGoalToNotion(
  goalId: string,
  pageId?: string
): Promise<{
  success: boolean
  message: string
  notionUrl?: string
}> {
  try {
    const result = await notionExport(goalId, pageId)
    return result
  } catch (error) {
    console.error('Error exporting to Notion:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to export to Notion'
    }
  }
}

/**
 * Export goal to Google Docs
 */
export async function exportGoalToGoogleDocs(
  goalId: string,
  folderId?: string
): Promise<{
  success: boolean
  message: string
  docUrl?: string
}> {
  try {
    const result = await googleDocsExport(goalId, folderId)
    return result
  } catch (error) {
    console.error('Error exporting to Google Docs:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to export to Google Docs'
    }
  }
}

/**
 * Search conversation memory
 */
export async function searchMemory(
  conversationId: string,
  query: string
): Promise<{
  success: boolean
  message: string
  results?: Array<{
    type: string
    content: string
    metadata?: any
  }>
}> {
  try {
    const results = await searchConversationMemory(conversationId, query)
    
    return {
      success: true,
      message: `Found ${results.length} result(s)`,
      results
    }
  } catch (error) {
    console.error('Error searching memory:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to search memory'
    }
  }
}

/**
 * Find matching mentors using profile-based scoring (see lib/matching).
 */
export async function findMentors(
  goalId: string,
  skills: string[]
): Promise<{
  success: boolean
  message: string
  mentors?: Array<{
    profileId: string
    displayName: string | null
    publicHandle: string | null
    score: number
    highlights: string[]
    profileUrl: string | null
  }>
}> {
  try {
    const supabase = createServiceClient()

    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('profile_id')
      .eq('id', goalId)
      .single()

    if (goalError || !goal?.profile_id) {
      return { success: false, message: 'Goal not found' }
    }

    const { getMatchingSuggestions } = await import('@/lib/matching/suggestions')
    const { suggestions } = await getMatchingSuggestions({
      menteeProfileId: goal.profile_id,
      skillsFilter: skills?.length ? skills : undefined,
      limit: 8,
    })

    if (suggestions.length === 0) {
      return {
        success: true,
        message:
          'No mentor matches found yet. Complete your profile and check back as more mentors join.',
        mentors: [],
      }
    }

    const mentors = suggestions.map((s) => ({
      profileId: s.mentorProfileId,
      displayName: s.displayName,
      publicHandle: s.publicHandle,
      score: s.score,
      highlights: s.highlights,
      profileUrl: s.publicHandle ? `/m/${s.publicHandle}` : null,
    }))

    return {
      success: true,
      message: `Found ${mentors.length} mentor match(es) ranked by fit.`,
      mentors,
    }
  } catch (error) {
    console.error('findMentors error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to find mentors',
    }
  }
}
