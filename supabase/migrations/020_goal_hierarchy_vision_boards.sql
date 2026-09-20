-- Goal hierarchy (year → quarter → month → week → day) and vision boards for onboarding journey

create type public.goal_hierarchy_level as enum (
  'long_term',
  'year',
  'quarter',
  'month',
  'week',
  'day'
);

alter table public.goals
  add column if not exists parent_goal_id uuid references public.goals(id) on delete cascade,
  add column if not exists hierarchy_level public.goal_hierarchy_level,
  add column if not exists plan_year int check (plan_year is null or (plan_year >= 2000 and plan_year <= 2100)),
  add column if not exists period_key text,
  add column if not exists is_locked boolean not null default false,
  add column if not exists sort_order int not null default 0;

create index if not exists goals_parent_goal_id_idx on public.goals(parent_goal_id);
create index if not exists goals_profile_hierarchy_idx on public.goals(profile_id, hierarchy_level);

comment on column public.goals.parent_goal_id is 'Parent node in goal hierarchy (null = root plan goal)';
comment on column public.goals.hierarchy_level is 'Temporal breakdown level for onboarding year plan';
comment on column public.goals.period_key is 'Stable period identifier e.g. 2026-Q3, 2026-09, 2026-W38';
comment on column public.goals.is_locked is 'When true, goal and descendants cannot be edited';

create table if not exists public.vision_boards (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null default 'Vision board',
  graph_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vision_boards_profile_id_idx on public.vision_boards(profile_id);
create index if not exists vision_boards_goal_id_idx on public.vision_boards(goal_id);

alter table public.vision_boards enable row level security;

create policy "Users manage own vision boards"
  on public.vision_boards for all
  using (profile_id = auth.get_profile_id());

create policy "Public vision boards via service"
  on public.vision_boards for select
  using (true);
