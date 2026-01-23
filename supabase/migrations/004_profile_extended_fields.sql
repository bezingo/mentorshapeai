-- 004_profile_extended_fields.sql
-- Extends the profiles table with additional personal information fields

-- Add personal information fields
alter table public.profiles
  add column if not exists phone text,
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists nationality text,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists timezone text,
  add column if not exists years_of_experience integer,
  add column if not exists completion_percentage integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

-- Add check constraints
alter table public.profiles
  add constraint chk_years_of_experience
    check (years_of_experience is null or (years_of_experience >= 0 and years_of_experience <= 50));

alter table public.profiles
  add constraint chk_completion_percentage
    check (completion_percentage >= 0 and completion_percentage <= 100);

-- Create trigger function to automatically update updated_at timestamp
create or replace function public.update_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to auto-update updated_at on profiles
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_profiles_updated_at();

-- Add index for commonly queried fields
create index if not exists idx_profiles_country on public.profiles(country) where country is not null;
create index if not exists idx_profiles_timezone on public.profiles(timezone) where timezone is not null;
