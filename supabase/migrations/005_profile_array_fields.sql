-- 005_profile_array_fields.sql
-- Adds text array columns for traits and mentor-specific fields

-- Add text array fields for traits section
alter table public.profiles
  add column if not exists languages_spoken text[] not null default '{}',
  add column if not exists can_mentor_for text[] not null default '{}',
  add column if not exists want_to_learn text[] not null default '{}',
  add column if not exists specializations text[] not null default '{}',
  add column if not exists hobbies text[] not null default '{}';

-- Add mentor-specific array fields
alter table public.profiles
  add column if not exists expertise_areas text[] not null default '{}',
  add column if not exists languages text[] not null default '{}';

-- Create GIN indexes for array fields to enable efficient contains/overlap queries
create index if not exists idx_profiles_languages_spoken on public.profiles using gin(languages_spoken) where array_length(languages_spoken, 1) > 0;
create index if not exists idx_profiles_can_mentor_for on public.profiles using gin(can_mentor_for) where array_length(can_mentor_for, 1) > 0;
create index if not exists idx_profiles_want_to_learn on public.profiles using gin(want_to_learn) where array_length(want_to_learn, 1) > 0;
create index if not exists idx_profiles_specializations on public.profiles using gin(specializations) where array_length(specializations, 1) > 0;
create index if not exists idx_profiles_expertise_areas on public.profiles using gin(expertise_areas) where array_length(expertise_areas, 1) > 0;
