-- 013_goal_advisor_conversations.sql
-- Adds tables for Goal Advisor conversational AI agent

-- Conversation threads table
create table public.goal_conversations (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text, -- Auto-generated from first message
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Individual messages table
create table public.goal_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.goal_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  tool_calls jsonb, -- Stores tool invocation details
  attachments jsonb, -- Array of file/link metadata
  created_at timestamptz default now()
);

-- Conversation memory/context table (for RAG)
create table public.goal_conversation_memory (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.goal_conversations(id) on delete cascade,
  type text not null check (type in ('file', 'link', 'note', 'analysis')),
  content text not null,
  metadata jsonb,
  embedding vector(1536), -- For semantic search (future)
  created_at timestamptz default now()
);

-- Create indexes for performance
create index idx_goal_conversations_goal_id on public.goal_conversations(goal_id);
create index idx_goal_conversations_profile_id on public.goal_conversations(profile_id);
create index idx_goal_conversation_messages_conversation_id on public.goal_conversation_messages(conversation_id);
create index idx_goal_conversation_messages_created_at on public.goal_conversation_messages(created_at);
create index idx_goal_conversation_memory_conversation_id on public.goal_conversation_memory(conversation_id);
create index idx_goal_conversation_memory_type on public.goal_conversation_memory(type);

-- Enable RLS
alter table public.goal_conversations enable row level security;
alter table public.goal_conversation_messages enable row level security;
alter table public.goal_conversation_memory enable row level security;

-- RLS policies for goal_conversations
create policy "Users can view own conversations"
  on public.goal_conversations for select
  using (profile_id = auth.uid());

create policy "Users can create own conversations"
  on public.goal_conversations for insert
  with check (profile_id = auth.uid());

create policy "Users can update own conversations"
  on public.goal_conversations for update
  using (profile_id = auth.uid());

create policy "Users can delete own conversations"
  on public.goal_conversations for delete
  using (profile_id = auth.uid());

-- RLS policies for goal_conversation_messages
create policy "Users can view own conversation messages"
  on public.goal_conversation_messages for select
  using (
    conversation_id in (
      select id from public.goal_conversations where profile_id = auth.uid()
    )
  );

create policy "Users can create messages in own conversations"
  on public.goal_conversation_messages for insert
  with check (
    conversation_id in (
      select id from public.goal_conversations where profile_id = auth.uid()
    )
  );

create policy "Users can update messages in own conversations"
  on public.goal_conversation_messages for update
  using (
    conversation_id in (
      select id from public.goal_conversations where profile_id = auth.uid()
    )
  );

create policy "Users can delete messages in own conversations"
  on public.goal_conversation_messages for delete
  using (
    conversation_id in (
      select id from public.goal_conversations where profile_id = auth.uid()
    )
  );

-- RLS policies for goal_conversation_memory
create policy "Users can view own conversation memory"
  on public.goal_conversation_memory for select
  using (
    conversation_id in (
      select id from public.goal_conversations where profile_id = auth.uid()
    )
  );

create policy "Users can create memory in own conversations"
  on public.goal_conversation_memory for insert
  with check (
    conversation_id in (
      select id from public.goal_conversations where profile_id = auth.uid()
    )
  );

create policy "Users can update memory in own conversations"
  on public.goal_conversation_memory for update
  using (
    conversation_id in (
      select id from public.goal_conversations where profile_id = auth.uid()
    )
  );

create policy "Users can delete memory in own conversations"
  on public.goal_conversation_memory for delete
  using (
    conversation_id in (
      select id from public.goal_conversations where profile_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
create or replace function update_goal_conversation_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger update_goal_conversation_updated_at
  before update on public.goal_conversations
  for each row
  execute function update_goal_conversation_updated_at();

-- Add comments for documentation
comment on table public.goal_conversations is 'Conversation threads for Goal Advisor AI agent';
comment on table public.goal_conversation_messages is 'Individual messages in Goal Advisor conversations';
comment on table public.goal_conversation_memory is 'Attached files, links, and context for Goal Advisor conversations';

comment on column public.goal_conversations.title is 'Auto-generated conversation title from first message';
comment on column public.goal_conversation_messages.role is 'Message role: user, assistant, system, or tool';
comment on column public.goal_conversation_messages.tool_calls is 'JSONB array of tool invocations and results';
comment on column public.goal_conversation_messages.attachments is 'JSONB array of attached file/link metadata';
comment on column public.goal_conversation_memory.type is 'Memory type: file, link, note, or analysis';
comment on column public.goal_conversation_memory.embedding is 'Vector embedding for semantic search (future feature)';
