-- 003_fix_goals_rls_insert.sql
-- Fix RLS policy for goals table to allow INSERT operations
-- The function is in public schema, not auth schema

-- Drop the existing policy
drop policy if exists "Mentees can manage own goals" on public.goals;

-- Recreate with proper WITH CHECK clause for INSERT operations
-- USING clause applies to SELECT/UPDATE/DELETE
-- WITH CHECK clause applies to INSERT/UPDATE
create policy "Mentees can manage own goals"
  on public.goals for all
  using (profile_id = public.get_profile_id())
  with check (profile_id = public.get_profile_id());

