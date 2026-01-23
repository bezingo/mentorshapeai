-- 006_profile_visibility_fields.sql
-- Adds section visibility toggle booleans to profiles table

-- Add visibility toggle fields for profile sections
alter table public.profiles
  add column if not exists traits_public boolean not null default true,
  add column if not exists work_history_public boolean not null default true,
  add column if not exists education_public boolean not null default true,
  add column if not exists skills_public boolean not null default true;
