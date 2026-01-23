import { createServiceClient } from '@/lib/supabase/service'
import type { GoalContext } from './goal-advisor-prompt'

/**
 * Build rich context for Goal Advisor AI
 * 
 * Loads goal data, milestones, conversation memory, and collaborations
 * to provide comprehensive context for AI responses.
 */
export async function buildGoalContext(
  goalId: string,
  conversationId: string | null
): Promise<GoalContext> {
  const supabase = createServiceClient()
  
  // Load goal data
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .single()
  
  if (goalError || !goal) {
    throw new Error(`Failed to load goal: ${goalError?.message || 'Goal not found'}`)
  }
  
  // Load milestones
  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .order('target_date', { ascending: true })
  
  // Load conversation memory (if conversation exists)
  let attachedResources: Array<{
    type: string
    content: string
    metadata?: any
  }> = []
  
  if (conversationId) {
    const { data: memory } = await supabase
      .from('goal_conversation_memory')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
    
    if (memory) {
      attachedResources = memory.map(m => ({
        type: m.type,
        content: m.content,
        metadata: m.metadata
      }))
    }
  }
  
  // Load collaborations
  const { data: collaborations } = await supabase
    .from('collaborations')
    .select('id, status, created_at')
    .eq('goal_id', goalId)
  
  // Build structured context
  return {
    goal: {
      title: goal.title,
      description: goal.description,
      category: goal.category,
      duration_days: goal.duration_days,
      success_definition: goal.success_definition,
      current_challenges: goal.current_challenges,
      refined_goal_statement: goal.refined_goal_statement,
      motivation: goal.motivation
    },
    milestones: (milestones || []).map(m => ({
      title: m.title,
      description: m.description,
      target_date: m.target_date,
      status: m.status
    })),
    attachedResources,
    collaborations: (collaborations || []).map(c => ({
      status: c.status,
      created_at: c.created_at
    }))
  }
}

/**
 * Load or create conversation for a goal
 * 
 * Returns existing conversation if found, otherwise creates a new one
 */
export async function getOrCreateConversation(
  goalId: string,
  profileId: string
): Promise<string> {
  const supabase = createServiceClient()
  
  // Check for existing conversation
  const { data: existing } = await supabase
    .from('goal_conversations')
    .select('id')
    .eq('goal_id', goalId)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (existing) {
    return existing.id
  }
  
  // Create new conversation
  const { data: newConversation, error } = await supabase
    .from('goal_conversations')
    .insert({
      goal_id: goalId,
      profile_id: profileId,
      title: 'Goal Advisor Chat'
    })
    .select('id')
    .single()
  
  if (error || !newConversation) {
    throw new Error(`Failed to create conversation: ${error?.message}`)
  }
  
  return newConversation.id
}

/**
 * Load conversation history
 * 
 * Returns all messages in chronological order
 */
export async function loadConversationHistory(conversationId: string) {
  const supabase = createServiceClient()
  
  const { data: messages, error } = await supabase
    .from('goal_conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to load conversation history: ${error.message}`)
  }
  
  return (messages || []).map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system' | 'tool',
    content: m.content,
    toolCalls: m.tool_calls,
    attachments: m.attachments,
    createdAt: m.created_at
  }))
}

/**
 * Save message to conversation
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  toolCalls?: any,
  attachments?: any
) {
  const supabase = createServiceClient()
  
  const { error } = await supabase
    .from('goal_conversation_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      tool_calls: toolCalls || null,
      attachments: attachments || null
    })
  
  if (error) {
    console.error('Failed to save message:', error)
    throw new Error(`Failed to save message: ${error.message}`)
  }
  
  // Update conversation updated_at timestamp
  await supabase
    .from('goal_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}

/**
 * Add resource to conversation memory
 */
export async function addMemoryResource(
  conversationId: string,
  type: 'file' | 'link' | 'note' | 'analysis',
  content: string,
  metadata?: any
) {
  const supabase = createServiceClient()
  
  const { data, error } = await supabase
    .from('goal_conversation_memory')
    .insert({
      conversation_id: conversationId,
      type,
      content,
      metadata: metadata || null
    })
    .select('id')
    .single()
  
  if (error) {
    throw new Error(`Failed to add memory resource: ${error.message}`)
  }
  
  return data.id
}

/**
 * Search conversation memory
 */
export async function searchConversationMemory(
  conversationId: string,
  query: string
): Promise<Array<{
  type: string
  content: string
  metadata?: any
}>> {
  const supabase = createServiceClient()
  
  // Simple text search (can be enhanced with vector search later)
  const { data: memory, error } = await supabase
    .from('goal_conversation_memory')
    .select('*')
    .eq('conversation_id', conversationId)
    .or(`content.ilike.%${query}%,metadata->>title.ilike.%${query}%,metadata->>url.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('Failed to search memory:', error)
    return []
  }
  
  return (memory || []).map(m => ({
    type: m.type,
    content: m.content,
    metadata: m.metadata
  }))
}

/**
 * Get goal owner's profile ID
 */
export async function getGoalOwnerId(goalId: string): Promise<string> {
  const supabase = createServiceClient()
  
  const { data: goal, error } = await supabase
    .from('goals')
    .select('profile_id')
    .eq('id', goalId)
    .single()
  
  if (error || !goal) {
    throw new Error(`Failed to get goal owner: ${error?.message || 'Goal not found'}`)
  }
  
  return goal.profile_id
}
