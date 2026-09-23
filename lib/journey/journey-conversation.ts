import { createServiceClient } from '@/lib/supabase/service'

export async function getOrCreateJourneyConversation(profileId: string): Promise<string> {
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('journey_conversations')
    .select('id')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    return existing.id
  }

  const { data: created, error } = await supabase
    .from('journey_conversations')
    .insert({
      profile_id: profileId,
      title: 'Journey onboarding',
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create journey conversation: ${error?.message}`)
  }

  return created.id
}

export async function assertJourneyConversationOwnedByProfile(
  conversationId: string,
  profileId: string
): Promise<void> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('journey_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Conversation not found')
  }
}

export async function saveJourneyMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  toolCalls?: unknown
) {
  const supabase = createServiceClient()

  const { error } = await supabase.from('journey_conversation_messages').insert({
    conversation_id: conversationId,
    role,
    content,
    tool_calls: toolCalls ?? null,
  })

  if (error) {
    throw new Error(`Failed to save journey message: ${error.message}`)
  }

  await supabase
    .from('journey_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}

export async function loadJourneyConversationHistory(conversationId: string) {
  const supabase = createServiceClient()
  const { data: messages, error } = await supabase
    .from('journey_conversation_messages')
    .select('id, role, content, tool_calls, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to load journey messages: ${error.message}`)
  }

  return messages ?? []
}

export async function getLatestJourneyConversationForProfile(profileId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('journey_conversations')
    .select('id')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}
