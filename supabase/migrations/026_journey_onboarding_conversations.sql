-- 026_journey_onboarding_conversations.sql
-- Conversation persistence for /journey onboarding chat (non–goal-scoped)

create table public.journey_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.journey_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.journey_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  tool_calls jsonb,
  attachments jsonb,
  created_at timestamptz default now()
);

create index idx_journey_conversations_profile_id on public.journey_conversations(profile_id);
create index idx_journey_conversation_messages_conversation_id on public.journey_conversation_messages(conversation_id);
create index idx_journey_conversation_messages_created_at on public.journey_conversation_messages(created_at);

alter table public.journey_conversations enable row level security;
alter table public.journey_conversation_messages enable row level security;

create policy "Users can view own journey conversations"
  on public.journey_conversations for select
  using (profile_id = auth.uid());

create policy "Users can create own journey conversations"
  on public.journey_conversations for insert
  with check (profile_id = auth.uid());

create policy "Users can update own journey conversations"
  on public.journey_conversations for update
  using (profile_id = auth.uid());

create policy "Users can delete own journey conversations"
  on public.journey_conversations for delete
  using (profile_id = auth.uid());

create policy "Users can view own journey conversation messages"
  on public.journey_conversation_messages for select
  using (
    conversation_id in (
      select id from public.journey_conversations where profile_id = auth.uid()
    )
  );

create policy "Users can create messages in own journey conversations"
  on public.journey_conversation_messages for insert
  with check (
    conversation_id in (
      select id from public.journey_conversations where profile_id = auth.uid()
    )
  );

create policy "Users can update messages in own journey conversations"
  on public.journey_conversation_messages for update
  using (
    conversation_id in (
      select id from public.journey_conversations where profile_id = auth.uid()
    )
  );

create policy "Users can delete messages in own journey conversations"
  on public.journey_conversation_messages for delete
  using (
    conversation_id in (
      select id from public.journey_conversations where profile_id = auth.uid()
    )
  );

create or replace function update_journey_conversation_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_journey_conversation_updated_at
  before update on public.journey_conversations
  for each row
  execute function update_journey_conversation_updated_at();

comment on table public.journey_conversations is 'Onboarding chat threads for /journey (profile-scoped)';
comment on table public.journey_conversation_messages is 'Messages in journey onboarding conversations';
