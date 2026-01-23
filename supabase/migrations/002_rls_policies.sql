-- 002_rls_policies.sql
-- Row Level Security policies for Mentorshape

-- Helper function to get current user's profile_id from Clerk JWT
-- Note: This assumes Clerk JWT contains clerk_user_id in claims
-- In production, you'll need to configure Clerk to include this in JWT
create or replace function auth.get_profile_id()
returns uuid as $$
  select id from public.profiles
  where user_id = (
    select id from public.users
    where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
  );
$$ language sql stable;

-------------------------
-- USERS TABLE POLICIES
-------------------------

-- Users can only read their own user record
create policy "Users can view own record"
  on public.users for select
  using (
    clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
  );

-- Service role can insert/update (via webhook)
create policy "Service role can manage users"
  on public.users for all
  using (auth.role() = 'service_role');

-------------------------
-- PROFILES TABLE POLICIES
-------------------------

-- Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (user_id = (
    select id from public.users
    where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
  ));

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (user_id = (
    select id from public.users
    where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
  ));

-- Users can insert their own profile (on creation)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (user_id = (
    select id from public.users
    where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
  ));

-- Public profiles are viewable by anyone (for mentor pages)
create policy "Public profiles are viewable"
  on public.profiles for select
  using (public_handle is not null);

-------------------------
-- GOALS TABLE POLICIES
-------------------------

-- Mentees can view their own goals
create policy "Mentees can view own goals"
  on public.goals for select
  using (profile_id = auth.get_profile_id());

-- Mentees can create/update their own goals
create policy "Mentees can manage own goals"
  on public.goals for all
  using (profile_id = auth.get_profile_id());

-- Public goals are viewable by anyone (via public_slug)
create policy "Public goals are viewable"
  on public.goals for select
  using (public_slug is not null and status = 'active');

-------------------------
-- COLLABORATIONS TABLE POLICIES
-------------------------

-- Users can view collaborations where they are mentor or mentee
create policy "Users can view own collaborations"
  on public.collaborations for select
  using (
    mentor_profile_id = auth.get_profile_id() or
    mentee_profile_id = auth.get_profile_id()
  );

-- Mentors can create collaborations
create policy "Mentors can create collaborations"
  on public.collaborations for insert
  with check (
    mentor_profile_id = auth.get_profile_id() and
    exists (
      select 1 from public.profiles
      where id = auth.get_profile_id() and is_mentor = true
    )
  );

-- Mentees can accept collaborations
create policy "Mentees can accept collaborations"
  on public.collaborations for update
  using (
    mentee_profile_id = auth.get_profile_id() and
    status = 'pending'
  )
  with check (status = 'active');

-- Either party can close collaboration
create policy "Parties can close collaboration"
  on public.collaborations for update
  using (
    mentor_profile_id = auth.get_profile_id() or
    mentee_profile_id = auth.get_profile_id()
  )
  with check (status = 'completed' or status = 'cancelled');

-------------------------
-- FOCUS_SESSIONS TABLE POLICIES
-------------------------

-- Users can view sessions in their collaborations
create policy "Users can view own sessions"
  on public.focus_sessions for select
  using (
    exists (
      select 1 from public.collaborations
      where id = collaboration_id and (
        mentor_profile_id = auth.get_profile_id() or
        mentee_profile_id = auth.get_profile_id()
      )
    )
  );

-- Mentees can create sessions
create policy "Mentees can create sessions"
  on public.focus_sessions for insert
  with check (
    exists (
      select 1 from public.collaborations
      where id = collaboration_id and
      mentee_profile_id = auth.get_profile_id() and
      status = 'active'
    )
  );

-- Users can update sessions in their collaborations
create policy "Users can update own sessions"
  on public.focus_sessions for update
  using (
    exists (
      select 1 from public.collaborations
      where id = collaboration_id and (
        mentor_profile_id = auth.get_profile_id() or
        mentee_profile_id = auth.get_profile_id()
      )
    )
  );

-------------------------
-- ORGANIZATIONS TABLE POLICIES
-------------------------

-- Org members can view their organization
create policy "Org members can view org"
  on public.organizations for select
  using (
    exists (
      select 1 from public.org_members
      where org_id = organizations.id and
      profile_id = auth.get_profile_id()
    )
  );

-- Org admins can update organization
create policy "Org admins can update org"
  on public.organizations for update
  using (
    exists (
      select 1 from public.org_members
      where org_id = organizations.id and
      profile_id = auth.get_profile_id() and
      role = 'admin'
    )
  );

-- Service role can create organizations (via API)
create policy "Service role can create orgs"
  on public.organizations for insert
  with check (true); -- API will handle authorization

-------------------------
-- ORG_MEMBERS TABLE POLICIES
-------------------------

-- Org members can view members of their org
create policy "Org members can view members"
  on public.org_members for select
  using (
    exists (
      select 1 from public.org_members om2
      where om2.org_id = org_members.org_id and
      om2.profile_id = auth.get_profile_id()
    )
  );

-- Only admins can manage members
create policy "Admins can manage members"
  on public.org_members for all
  using (
    exists (
      select 1 from public.org_members
      where org_id = org_members.org_id and
      profile_id = auth.get_profile_id() and
      role = 'admin'
    )
  );

-------------------------
-- TRANSACTIONS TABLE POLICIES
-------------------------

-- Buyers can view their transactions
create policy "Buyers can view transactions"
  on public.transactions for select
  using (buyer_profile_id = auth.get_profile_id());

-- Mentors can view transactions for their offers
create policy "Mentors can view offer transactions"
  on public.transactions for select
  using (mentor_profile_id = auth.get_profile_id());

-- Service role can insert transactions (via webhook)
create policy "Service role can create transactions"
  on public.transactions for insert
  with check (auth.role() = 'service_role');

-------------------------
-- NOTIFICATIONS TABLE POLICIES
-------------------------

-- Users can view their own notifications
create policy "Users can view own notifications"
  on public.notifications for select
  using (profile_id = auth.get_profile_id());

-- Users can update their own notifications (mark as read)
create policy "Users can update own notifications"
  on public.notifications for update
  using (profile_id = auth.get_profile_id());

-- Service role can create notifications (via API/webhooks)
create policy "Service role can create notifications"
  on public.notifications for insert
  with check (true); -- API will handle authorization

-------------------------
-- NOTIFICATION_PREFERENCES TABLE POLICIES
-------------------------

-- Users can view their own notification preferences
create policy "Users can view own preferences"
  on public.notification_preferences for select
  using (profile_id = auth.get_profile_id());

-- Users can manage their own notification preferences
create policy "Users can manage own preferences"
  on public.notification_preferences for all
  using (profile_id = auth.get_profile_id());

-------------------------
-- ADDITIONAL TABLE POLICIES
-------------------------

-- Work experiences, educations, skills follow profile policies
-- Users can manage their own profile data
create policy "Users can manage own work experiences"
  on public.work_experiences for all
  using (
    profile_id in (
      select id from public.profiles
      where user_id = (
        select id from public.users
        where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

create policy "Users can manage own educations"
  on public.educations for all
  using (
    profile_id in (
      select id from public.profiles
      where user_id = (
        select id from public.users
        where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

create policy "Users can manage own skills"
  on public.skills for all
  using (
    profile_id in (
      select id from public.profiles
      where user_id = (
        select id from public.users
        where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

-- Public profile data is viewable
create policy "Public work experiences are viewable"
  on public.work_experiences for select
  using (
    is_public = true and
    profile_id in (select id from public.profiles where public_handle is not null)
  );

create policy "Public educations are viewable"
  on public.educations for select
  using (
    is_public = true and
    profile_id in (select id from public.profiles where public_handle is not null)
  );

create policy "Public skills are viewable"
  on public.skills for select
  using (
    is_public = true and
    profile_id in (select id from public.profiles where public_handle is not null)
  );

-- Goal milestones follow goal policies
create policy "Users can manage goal milestones"
  on public.goal_milestones for all
  using (
    goal_id in (
      select id from public.goals
      where profile_id = auth.get_profile_id()
    )
  );

-- Public goal milestones are viewable
create policy "Public goal milestones are viewable"
  on public.goal_milestones for select
  using (
    goal_id in (
      select id from public.goals
      where public_slug is not null and status = 'active'
    )
  );

-- Focus session artifacts follow session policies
create policy "Users can view session artifacts"
  on public.focus_session_artifacts for select
  using (
    focus_session_id in (
      select id from public.focus_sessions
      where exists (
        select 1 from public.collaborations
        where id = collaboration_id and (
          mentor_profile_id = auth.get_profile_id() or
          mentee_profile_id = auth.get_profile_id()
        )
      )
    )
  );

-- Check-ins follow collaboration policies
create policy "Users can manage check-ins"
  on public.checkins for all
  using (
    collaboration_id in (
      select id from public.collaborations
      where mentor_profile_id = auth.get_profile_id() or
      mentee_profile_id = auth.get_profile_id()
    )
  );

-- Mentor offers are public (for mentor pages)
create policy "Mentor offers are viewable"
  on public.mentor_offers for select
  using (is_active = true);

-- Mentors can manage their own offers
create policy "Mentors can manage own offers"
  on public.mentor_offers for all
  using (mentor_profile_id = auth.get_profile_id());

-- Mentor badges are public
create policy "Mentor badges are viewable"
  on public.mentor_badges for select
  using (true);

-- Ratings follow collaboration policies
create policy "Users can view collaboration ratings"
  on public.ratings for select
  using (
    collaboration_id in (
      select id from public.collaborations
      where mentor_profile_id = auth.get_profile_id() or
      mentee_profile_id = auth.get_profile_id()
    )
  );

create policy "Mentees can create ratings"
  on public.ratings for insert
  with check (
    mentee_profile_id = auth.get_profile_id() and
    collaboration_id in (
      select id from public.collaborations
      where mentee_profile_id = auth.get_profile_id()
    )
  );

-- Programs follow organization policies
create policy "Org members can view programs"
  on public.programs for select
  using (
    org_id in (
      select org_id from public.org_members
      where profile_id = auth.get_profile_id()
    )
  );

create policy "Org admins can manage programs"
  on public.programs for all
  using (
    org_id in (
      select org_id from public.org_members
      where profile_id = auth.get_profile_id() and role = 'admin'
    )
  );

-- Program participants follow program policies
create policy "Org members can view program participants"
  on public.program_participants for select
  using (
    program_id in (
      select id from public.programs
      where org_id in (
        select org_id from public.org_members
        where profile_id = auth.get_profile_id()
      )
    )
  );

-- Matches follow program policies
create policy "Org members can view matches"
  on public.matches for select
  using (
    program_id in (
      select id from public.programs
      where org_id in (
        select org_id from public.org_members
        where profile_id = auth.get_profile_id()
      )
    )
  );

create policy "Org admins can manage matches"
  on public.matches for all
  using (
    program_id in (
      select id from public.programs
      where org_id in (
        select org_id from public.org_members
        where profile_id = auth.get_profile_id() and role = 'admin'
      )
    )
  );

-- Subscriptions follow user/org policies
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (
    user_id in (
      select id from public.users
      where clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
    ) or
    org_id in (
      select org_id from public.org_members
      where profile_id = auth.get_profile_id()
    )
  );

-- Service role can manage subscriptions (via Clerk webhooks)
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

