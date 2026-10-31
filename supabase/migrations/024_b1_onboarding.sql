-- Migration: B1 Sign-up, Role, Age Gate, Onboarding
-- Adds role selection, onboarding state, safe defaults for minors,
-- and org type for school vs university pilot flexibility.

-- =====================================================
-- PROFILE ROLE AND ONBOARDING STATE
-- =====================================================

-- Profile role: what kind of user they are on the platform
CREATE TYPE profile_role AS ENUM ('mentee', 'mentor', 'both', 'org_admin');

-- Onboarding progress state
CREATE TYPE onboarding_state AS ENUM (
  'pending',           -- Just signed up, hasn't started onboarding
  'role_selection',    -- Choosing their role
  'profile_setup',     -- Setting name/photo
  'org_join',          -- Joining an organization (if applicable)
  'goals_setup',       -- Setting up their goals (mentees)
  'consent',           -- Consent capture
  'completed'          -- Onboarding complete
);

-- Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role profile_role,
  ADD COLUMN IF NOT EXISTS onboarding_state onboarding_state NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS recording_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invite_only_onelink BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS guardian_consent_pending BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guardian_consent_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Create index for onboarding state lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_state ON public.profiles(onboarding_state);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Comments
COMMENT ON COLUMN public.profiles.role IS 'User role: mentee, mentor, both (can act as either), or org_admin';
COMMENT ON COLUMN public.profiles.onboarding_state IS 'Current step in the onboarding flow';
COMMENT ON COLUMN public.profiles.recording_consent IS 'Whether user consents to call recording (defaults false for safety)';
COMMENT ON COLUMN public.profiles.invite_only_onelink IS 'Whether OneLink is invite-only (defaults true for minors safety)';
COMMENT ON COLUMN public.profiles.guardian_consent_pending IS 'Whether guardian consent is pending (for minors)';
COMMENT ON COLUMN public.profiles.guardian_consent_sent_at IS 'When guardian consent request was sent';
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'When user completed onboarding';

-- =====================================================
-- ORGANIZATION TYPE (SCHOOL VS UNIVERSITY)
-- =====================================================

CREATE TYPE org_type AS ENUM ('school', 'university');

-- Add org_type column to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_type org_type DEFAULT 'school';

COMMENT ON COLUMN public.organizations.org_type IS 'Organization type: school (minors, stricter rules) or university (adults)';

-- =====================================================
-- ONBOARDING GOALS - FOR MENTEE GOAL SETUP
-- =====================================================

-- Fixed goal categories for onboarding
CREATE TYPE goal_category AS ENUM ('finance', 'career', 'personal_growth', 'entrepreneurship');

-- Onboarding goals table for the 4 fixed categories
CREATE TABLE IF NOT EXISTS public.onboarding_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category goal_category NOT NULL,
  description TEXT,
  target_date DATE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, category)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_goals_profile ON public.onboarding_goals(profile_id);

-- Enable RLS
ALTER TABLE public.onboarding_goals ENABLE ROW LEVEL SECURITY;

-- Service role can manage onboarding goals
CREATE POLICY "Service role manages onboarding_goals"
  ON public.onboarding_goals FOR ALL
  USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE public.onboarding_goals IS 'Goals set during onboarding in the 4 fixed categories';
COMMENT ON COLUMN public.onboarding_goals.category IS 'One of: finance, career, personal_growth, entrepreneurship';
COMMENT ON COLUMN public.onboarding_goals.description IS 'User description of their goal in this category';
COMMENT ON COLUMN public.onboarding_goals.target_date IS 'When they hope to achieve this goal';
COMMENT ON COLUMN public.onboarding_goals.priority IS 'Relative priority (lower = higher priority)';

-- Updated_at trigger for onboarding_goals
DROP TRIGGER IF EXISTS update_onboarding_goals_updated_at ON public.onboarding_goals;
CREATE TRIGGER update_onboarding_goals_updated_at
  BEFORE UPDATE ON public.onboarding_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ORG INVITES TABLE (STUBBED FOR B2)
-- =====================================================

-- This table will be fully implemented in B2, but we need it for the onboarding
-- org join step to work (checking invite codes and email domains)
CREATE TABLE IF NOT EXISTS public.org_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT,
  invite_code TEXT UNIQUE,
  role org_member_role NOT NULL DEFAULT 'mentee',
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES public.profiles(id),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_code ON public.org_invites(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.org_invites(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON public.org_invites(org_id);

ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages org_invites"
  ON public.org_invites FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.org_invites IS 'Org invite codes and email invites (fully implemented in B2)';

-- =====================================================
-- HELPER FUNCTION: COMPUTE AGE BAND
-- =====================================================

-- Function to determine if a user is a minor based on date_of_birth
CREATE OR REPLACE FUNCTION public.is_minor(dob DATE)
RETURNS BOOLEAN AS $$
BEGIN
  IF dob IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN (CURRENT_DATE - dob) / 365 < 18;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.is_minor IS 'Returns true if the person is under 18 based on date of birth';

-- Function to get age band for a profile
CREATE OR REPLACE FUNCTION public.get_age_band(dob DATE)
RETURNS TEXT AS $$
DECLARE
  age INTEGER;
BEGIN
  IF dob IS NULL THEN
    RETURN 'unknown';
  END IF;
  age := (CURRENT_DATE - dob) / 365;
  IF age < 18 THEN
    RETURN 'minor';
  ELSE
    RETURN 'adult';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.get_age_band IS 'Returns age band: minor (under 18), adult (18+), or unknown';
