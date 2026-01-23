-- 001_initial.sql
-- Core schema for Mentorshape

create extension if not exists "uuid-ossp";

-------------------------
-- USERS & PROFILES
-------------------------

create table public.users (
  id uuid primary key default uuid_generate_v4(),
  clerk_user_id text unique not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  display_name text,
  headline text,
  bio text,
  avatar_url text,
  public_handle text unique,
  is_mentor boolean not null default false,
  is_mentee boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.work_experiences (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  company text,
  title text,
  start_date date,
  end_date date,
  description text,
  is_public boolean not null default true
);

create table public.educations (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  institution text,
  degree text,
  start_date date,
  end_date date,
  is_public boolean not null default true
);

create table public.skills (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  level text,
  is_public boolean not null default true
);

-------------------------
-- GOALS & MILESTONES
-------------------------

create type goal_status as enum ('draft','active','completed','archived');
create type milestone_status as enum ('pending','in_progress','done');

create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  duration_days int,
  status goal_status not null default 'draft',
  public_slug text unique,
  success_definition text,
  current_challenges text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.goal_milestones (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  status milestone_status not null default 'pending'
);

-------------------------
-- COLLABORATIONS & SESSIONS
-------------------------

create type collaboration_status as enum ('pending','active','completed','cancelled');
create type session_status as enum ('scheduled','completed','cancelled');

create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text,
  domain text,
  logo_url text,
  billing_customer_id text,
  created_at timestamptz not null default now()
);

create table public.collaborations (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  mentor_profile_id uuid not null references public.profiles(id) on delete restrict,
  mentee_profile_id uuid not null references public.profiles(id) on delete restrict,
  status collaboration_status not null default 'pending',
  start_date date,
  end_date date,
  org_id uuid references public.organizations(id) on delete set null
);

create table public.focus_sessions (
  id uuid primary key default uuid_generate_v4(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz,
  meeting_url text,
  status session_status not null default 'scheduled',
  agenda_ai jsonb,
  agenda_notes text,
  created_at timestamptz not null default now()
);

create table public.focus_session_artifacts (
  id uuid primary key default uuid_generate_v4(),
  focus_session_id uuid not null references public.focus_sessions(id) on delete cascade,
  recording_url text,
  transcript_text text,
  summary_ai text,
  action_items_ai jsonb,
  action_items_custom text
);

create table public.checkins (
  id uuid primary key default uuid_generate_v4(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  mood int check (mood between 1 and 5),
  progress_note text,
  blockers text,
  created_at timestamptz not null default now()
);

-------------------------
-- MENTOR ECONOMY
-------------------------

create type mentor_offer_type as enum ('free_collab','paid_consult','digital_product');

create table public.mentor_offers (
  id uuid primary key default uuid_generate_v4(),
  mentor_profile_id uuid not null references public.profiles(id) on delete cascade,
  type mentor_offer_type not null,
  title text not null,
  description text,
  stripe_product_id text,
  price_cents int,
  currency text default 'usd',
  duration_minutes int,
  is_active boolean not null default true
);

create table public.mentor_badges (
  id uuid primary key default uuid_generate_v4(),
  mentor_profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  label text not null,
  metadata jsonb,
  awarded_at timestamptz not null default now()
);

create table public.ratings (
  id uuid primary key default uuid_generate_v4(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  mentor_profile_id uuid not null references public.profiles(id) on delete cascade,
  mentee_profile_id uuid not null references public.profiles(id) on delete cascade,
  score int not null check (score between 1 and 5),
  feedback text
);

-------------------------
-- ORG MEMBERS & PROGRAMS
-------------------------

create type org_member_role as enum ('admin','mentor','mentee');
create type program_participant_role as enum ('mentor','mentee');
create type match_status as enum ('proposed','confirmed','declined');

create table public.org_members (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role org_member_role not null
);

create table public.programs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  start_date date,
  end_date date,
  settings jsonb
);

create table public.program_participants (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references public.programs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role program_participant_role not null
);

create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references public.programs(id) on delete cascade,
  mentor_profile_id uuid not null references public.profiles(id) on delete cascade,
  mentee_profile_id uuid not null references public.profiles(id) on delete cascade,
  status match_status not null default 'proposed',
  match_score double precision
);

-------------------------
-- SUBSCRIPTIONS & TRANSACTIONS
-------------------------

create type subscription_status as enum ('active','past_due','cancelled','trialing');
create type transaction_status as enum ('pending','succeeded','failed');

create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  stripe_subscription_id text not null,
  plan text not null,
  status subscription_status not null,
  renewal_date date
);

create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  buyer_profile_id uuid not null references public.profiles(id) on delete cascade,
  mentor_profile_id uuid not null references public.profiles(id) on delete cascade,
  mentor_offer_id uuid not null references public.mentor_offers(id) on delete cascade,
  stripe_payment_intent_id text not null,
  amount_cents int not null,
  platform_fee_cents int not null,
  status transaction_status not null,
  created_at timestamptz not null default now()
);

-------------------------
-- NOTIFICATIONS
-------------------------

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  action_url text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null,
  type text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(profile_id, channel, type)
);

-------------------------
-- BASIC INDEXES
-------------------------

create index idx_profiles_user_id on public.profiles(user_id);
create index idx_profiles_public_handle on public.profiles(public_handle) where public_handle is not null;
create index idx_goals_profile_id on public.goals(profile_id);
create index idx_goals_public_slug on public.goals(public_slug) where public_slug is not null;
create index idx_goals_status on public.goals(status);
create index idx_collaborations_goal_id on public.collaborations(goal_id);
create index idx_collaborations_mentor on public.collaborations(mentor_profile_id);
create index idx_collaborations_mentee on public.collaborations(mentee_profile_id);
create index idx_collaborations_status on public.collaborations(status);
create index idx_focus_sessions_collab on public.focus_sessions(collaboration_id);
create index idx_focus_sessions_start_time on public.focus_sessions(start_time);
create index idx_focus_sessions_status on public.focus_sessions(status);
create index idx_org_members_org on public.org_members(org_id);
create index idx_programs_org on public.programs(org_id);
create index idx_subscriptions_user_id on public.subscriptions(user_id) where user_id is not null;
create index idx_subscriptions_org_id on public.subscriptions(org_id) where org_id is not null;
create index idx_subscriptions_status on public.subscriptions(status);
create index idx_transactions_buyer on public.transactions(buyer_profile_id);
create index idx_transactions_mentor on public.transactions(mentor_profile_id);
create index idx_transactions_status on public.transactions(status);
create index idx_notifications_profile_unread on public.notifications(profile_id, read_at) where read_at is null;

-------------------------
-- ENABLE RLS
-------------------------

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.collaborations enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

