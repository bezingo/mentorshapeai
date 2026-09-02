-- Migration: Replace Clerk with Better Auth
-- This migration:
-- 1. Creates Better Auth tables (user, session, account, verification)
-- 2. Updates existing users table to remove clerk_user_id dependency
-- 3. Updates profiles to reference Better Auth user IDs directly
-- 4. Updates RLS policies for server-side auth via service role

-- =====================================================
-- BETTER AUTH CORE TABLES
-- =====================================================

-- User table (Better Auth primary user table - must be named "user")
CREATE TABLE IF NOT EXISTS public."user" (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN DEFAULT FALSE,
  image TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session table (Better Auth sessions)
CREATE TABLE IF NOT EXISTS public.session (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE
);

-- Account table (OAuth providers)
CREATE TABLE IF NOT EXISTS public.account (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verification table (email verification, password reset)
CREATE TABLE IF NOT EXISTS public.verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);

-- Create indexes for Better Auth tables
CREATE INDEX IF NOT EXISTS idx_session_user_id ON public.session("userId");
CREATE INDEX IF NOT EXISTS idx_session_token ON public.session(token);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON public.account("userId");
CREATE INDEX IF NOT EXISTS idx_account_provider ON public.account("providerId", "accountId");
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON public.verification(identifier);

-- Enable RLS on Better Auth tables
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification ENABLE ROW LEVEL SECURITY;

-- Better Auth tables are managed by service role only (no direct client access)
CREATE POLICY "Service role manages user"
  ON public."user" FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages session"
  ON public.session FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages account"
  ON public.account FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages verification"
  ON public.verification FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- UPDATE EXISTING TABLES FOR BETTER AUTH
-- =====================================================

-- Drop the clerk_user_id constraint and column from users table
-- First, drop existing RLS policies that reference clerk_user_id
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;

-- Make clerk_user_id nullable (will be removed after data migration)
ALTER TABLE public.users ALTER COLUMN clerk_user_id DROP NOT NULL;

-- Add better_auth_user_id to users table for migration
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS better_auth_user_id TEXT UNIQUE;

-- Create index on better_auth_user_id
CREATE INDEX IF NOT EXISTS idx_users_better_auth_user_id ON public.users(better_auth_user_id);

-- Update profiles table to support direct Better Auth user ID
-- (profiles.user_id still references users.id, but we'll streamline this)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

-- =====================================================
-- UPDATE RLS POLICIES FOR SERVICE ROLE ACCESS
-- =====================================================

-- All authenticated access now goes through server routes with service role
-- Client anon key cannot bypass RLS

-- Users table: service role only
CREATE POLICY "Service role manages users"
  ON public.users FOR ALL
  USING (auth.role() = 'service_role');

-- Profiles: service role for management, public for public profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;

CREATE POLICY "Service role manages profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public profiles viewable by all"
  ON public.profiles FOR SELECT
  USING (public_handle IS NOT NULL);

-- Goals: service role for management, public for public goals
DROP POLICY IF EXISTS "Mentees can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Mentees can manage own goals" ON public.goals;
DROP POLICY IF EXISTS "Public goals are viewable" ON public.goals;

CREATE POLICY "Service role manages goals"
  ON public.goals FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public goals viewable by all"
  ON public.goals FOR SELECT
  USING (public_slug IS NOT NULL AND status = 'active');

-- Collaborations: service role only
DROP POLICY IF EXISTS "Users can view own collaborations" ON public.collaborations;
DROP POLICY IF EXISTS "Mentors can create collaborations" ON public.collaborations;
DROP POLICY IF EXISTS "Mentees can accept collaborations" ON public.collaborations;
DROP POLICY IF EXISTS "Parties can close collaboration" ON public.collaborations;

CREATE POLICY "Service role manages collaborations"
  ON public.collaborations FOR ALL
  USING (auth.role() = 'service_role');

-- Focus sessions: service role only
DROP POLICY IF EXISTS "Users can view own sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Mentees can create sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.focus_sessions;

CREATE POLICY "Service role manages focus_sessions"
  ON public.focus_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- Organizations: service role + public read for domain allowlist checks
DROP POLICY IF EXISTS "Org members can view org" ON public.organizations;
DROP POLICY IF EXISTS "Org admins can update org" ON public.organizations;
DROP POLICY IF EXISTS "Service role can create orgs" ON public.organizations;

CREATE POLICY "Service role manages organizations"
  ON public.organizations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Organizations public read"
  ON public.organizations FOR SELECT
  USING (TRUE);

-- Org members: service role only
DROP POLICY IF EXISTS "Org members can view members" ON public.org_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.org_members;

CREATE POLICY "Service role manages org_members"
  ON public.org_members FOR ALL
  USING (auth.role() = 'service_role');

-- Notifications: service role only
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can create notifications" ON public.notifications;

CREATE POLICY "Service role manages notifications"
  ON public.notifications FOR ALL
  USING (auth.role() = 'service_role');

-- Notification preferences: service role only
DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.notification_preferences;

CREATE POLICY "Service role manages notification_preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- Work experiences, educations, skills: service role + public read
DROP POLICY IF EXISTS "Users can manage own work experiences" ON public.work_experiences;
DROP POLICY IF EXISTS "Public work experiences are viewable" ON public.work_experiences;

CREATE POLICY "Service role manages work_experiences"
  ON public.work_experiences FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public work experiences viewable"
  ON public.work_experiences FOR SELECT
  USING (
    is_public = TRUE AND
    profile_id IN (SELECT id FROM public.profiles WHERE public_handle IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can manage own educations" ON public.educations;
DROP POLICY IF EXISTS "Public educations are viewable" ON public.educations;

CREATE POLICY "Service role manages educations"
  ON public.educations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public educations viewable"
  ON public.educations FOR SELECT
  USING (
    is_public = TRUE AND
    profile_id IN (SELECT id FROM public.profiles WHERE public_handle IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can manage own skills" ON public.skills;
DROP POLICY IF EXISTS "Public skills are viewable" ON public.skills;

CREATE POLICY "Service role manages skills"
  ON public.skills FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public skills viewable"
  ON public.skills FOR SELECT
  USING (
    is_public = TRUE AND
    profile_id IN (SELECT id FROM public.profiles WHERE public_handle IS NOT NULL)
  );

-- Goal milestones: service role + public read
DROP POLICY IF EXISTS "Users can manage goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Public goal milestones are viewable" ON public.goal_milestones;

CREATE POLICY "Service role manages goal_milestones"
  ON public.goal_milestones FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public goal milestones viewable"
  ON public.goal_milestones FOR SELECT
  USING (
    goal_id IN (
      SELECT id FROM public.goals
      WHERE public_slug IS NOT NULL AND status = 'active'
    )
  );

-- Focus session artifacts: service role only
DROP POLICY IF EXISTS "Users can view session artifacts" ON public.focus_session_artifacts;

CREATE POLICY "Service role manages focus_session_artifacts"
  ON public.focus_session_artifacts FOR ALL
  USING (auth.role() = 'service_role');

-- Check-ins: service role only
DROP POLICY IF EXISTS "Users can manage check-ins" ON public.checkins;

CREATE POLICY "Service role manages checkins"
  ON public.checkins FOR ALL
  USING (auth.role() = 'service_role');

-- Mentor offers: service role + public read for active offers
DROP POLICY IF EXISTS "Mentor offers are viewable" ON public.mentor_offers;
DROP POLICY IF EXISTS "Mentors can manage own offers" ON public.mentor_offers;

CREATE POLICY "Service role manages mentor_offers"
  ON public.mentor_offers FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Active mentor offers viewable"
  ON public.mentor_offers FOR SELECT
  USING (is_active = TRUE);

-- Mentor badges: service role + public read
DROP POLICY IF EXISTS "Mentor badges are viewable" ON public.mentor_badges;

CREATE POLICY "Service role manages mentor_badges"
  ON public.mentor_badges FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Mentor badges viewable"
  ON public.mentor_badges FOR SELECT
  USING (TRUE);

-- Ratings: service role only
DROP POLICY IF EXISTS "Users can view collaboration ratings" ON public.ratings;
DROP POLICY IF EXISTS "Mentees can create ratings" ON public.ratings;

CREATE POLICY "Service role manages ratings"
  ON public.ratings FOR ALL
  USING (auth.role() = 'service_role');

-- Programs: service role only
DROP POLICY IF EXISTS "Org members can view programs" ON public.programs;
DROP POLICY IF EXISTS "Org admins can manage programs" ON public.programs;

CREATE POLICY "Service role manages programs"
  ON public.programs FOR ALL
  USING (auth.role() = 'service_role');

-- Program participants: service role only
DROP POLICY IF EXISTS "Org members can view program participants" ON public.program_participants;

CREATE POLICY "Service role manages program_participants"
  ON public.program_participants FOR ALL
  USING (auth.role() = 'service_role');

-- Matches: service role only
DROP POLICY IF EXISTS "Org members can view matches" ON public.matches;
DROP POLICY IF EXISTS "Org admins can manage matches" ON public.matches;

CREATE POLICY "Service role manages matches"
  ON public.matches FOR ALL
  USING (auth.role() = 'service_role');

-- Subscriptions: service role only
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Transactions: service role only
DROP POLICY IF EXISTS "Buyers can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Mentors can view offer transactions" ON public.transactions;
DROP POLICY IF EXISTS "Service role can create transactions" ON public.transactions;

CREATE POLICY "Service role manages transactions"
  ON public.transactions FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- DROP OLD HELPER FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS auth.get_profile_id();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.auth_user IS 'Better Auth user table - primary authentication';
COMMENT ON TABLE public.auth_session IS 'Better Auth session tokens';
COMMENT ON TABLE public.auth_account IS 'Better Auth OAuth accounts and password credentials';
COMMENT ON TABLE public.auth_verification IS 'Better Auth email verification and password reset tokens';
COMMENT ON COLUMN public.users.better_auth_user_id IS 'Reference to Better Auth user ID';
COMMENT ON COLUMN public.profiles.auth_user_id IS 'Direct reference to Better Auth user ID for faster lookups';
