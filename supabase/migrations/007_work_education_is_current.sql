-- 007_work_education_is_current.sql
-- Adds is_current flags and timestamps to work_experiences and educations tables

-- Add is_current and timestamps to work_experiences
alter table public.work_experiences
  add column if not exists is_current boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Add is_current and timestamps to educations
alter table public.educations
  add column if not exists is_current boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Create trigger function for work_experiences updated_at
create or replace function public.update_work_experiences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger function for educations updated_at
create or replace function public.update_educations_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers to auto-update updated_at
drop trigger if exists trg_work_experiences_updated_at on public.work_experiences;
create trigger trg_work_experiences_updated_at
  before update on public.work_experiences
  for each row
  execute function public.update_work_experiences_updated_at();

drop trigger if exists trg_educations_updated_at on public.educations;
create trigger trg_educations_updated_at
  before update on public.educations
  for each row
  execute function public.update_educations_updated_at();

-- Add indexes for common queries
create index if not exists idx_work_experiences_profile_start on public.work_experiences(profile_id, start_date desc);
create index if not exists idx_work_experiences_is_current on public.work_experiences(profile_id) where is_current = true;
create index if not exists idx_educations_profile_start on public.educations(profile_id, start_date desc);
create index if not exists idx_educations_is_current on public.educations(profile_id) where is_current = true;
