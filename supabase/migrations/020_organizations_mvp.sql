-- 020_organizations_mvp.sql
-- Organization MVP: invite codes, uniqueness, program participant RLS

alter table public.organizations
  add column if not exists invite_code text;

create unique index if not exists idx_organizations_invite_code
  on public.organizations (invite_code)
  where invite_code is not null;

create unique index if not exists idx_org_members_org_profile
  on public.org_members (org_id, profile_id);

create unique index if not exists idx_program_participants_program_profile
  on public.program_participants (program_id, profile_id);

create unique index if not exists idx_matches_program_pair
  on public.matches (program_id, mentor_profile_id, mentee_profile_id);

-- Org admins can manage program participants (invite mentors/mentees)
create policy "Org admins can manage program participants"
  on public.program_participants for all
  using (
    program_id in (
      select id from public.programs
      where org_id in (
        select org_id from public.org_members
        where profile_id = auth.get_profile_id() and role = 'admin'
      )
    )
  );

-- Org members may enroll themselves in a program (role chosen at enroll time)
create policy "Org members can enroll in programs"
  on public.program_participants for insert
  with check (
    profile_id = auth.get_profile_id()
    and program_id in (
      select p.id
      from public.programs p
      inner join public.org_members om on om.org_id = p.org_id
      where om.profile_id = auth.get_profile_id()
    )
  );

-- Members can view their own program participation rows
create policy "Users can view own program participation"
  on public.program_participants for select
  using (profile_id = auth.get_profile_id());
