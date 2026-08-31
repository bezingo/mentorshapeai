-- 021_m2_school_tenancy_safeguarding.sql
-- M2: School tenancy, counselor features, safeguarding
-- Uses existing organizations, org_members, programs, matches tables

-------------------------
-- ENHANCE ORGANIZATIONS FOR SCHOOL TENANCY
-------------------------

-- Add school-specific settings to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS allowed_domains TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_school BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS require_consent BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS min_age INTEGER DEFAULT 13,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.organizations.allowed_domains IS 'Email domains allowed to join this org (e.g. ["school.edu"])';
COMMENT ON COLUMN public.organizations.settings IS 'JSON settings for the organization';
COMMENT ON COLUMN public.organizations.is_school IS 'Whether this is a school organization';
COMMENT ON COLUMN public.organizations.require_consent IS 'Whether consent is required before collab/chat';
COMMENT ON COLUMN public.organizations.min_age IS 'Minimum age for participation';

-------------------------
-- ENHANCE ORG_MEMBERS
-------------------------

-- Add pending invite state and metadata
ALTER TABLE public.org_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_email TEXT,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS year_grade TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.org_members.status IS 'Status: pending (invited), active, inactive';
COMMENT ON COLUMN public.org_members.invited_email IS 'Email used for invite (before user signs up)';
COMMENT ON COLUMN public.org_members.year_grade IS 'Academic year/grade for students';
COMMENT ON COLUMN public.org_members.metadata IS 'Additional metadata (from CSV import etc)';

-- Create index for pending invites lookup
CREATE INDEX IF NOT EXISTS idx_org_members_invited_email 
  ON public.org_members(invited_email) WHERE invited_email IS NOT NULL;

-- Create index for org+status lookup
CREATE INDEX IF NOT EXISTS idx_org_members_org_status 
  ON public.org_members(org_id, status);

-- Unique constraint for profile per org (a user can only be in one org once)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_members_org_profile_unique'
  ) THEN
    ALTER TABLE public.org_members 
      ADD CONSTRAINT org_members_org_profile_unique UNIQUE(org_id, profile_id);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

-------------------------
-- SAFEGUARDING: CONSENT & AGE
-------------------------

-- Add consent and age fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_email TEXT,
  ADD COLUMN IF NOT EXISTS parent_consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parent_consent_given_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.date_of_birth IS 'Date of birth for age verification';
COMMENT ON COLUMN public.profiles.consent_given IS 'Whether user has given consent to participate';
COMMENT ON COLUMN public.profiles.parent_email IS 'Parent/guardian email for minors';
COMMENT ON COLUMN public.profiles.parent_consent_given IS 'Whether parent has given consent';

-------------------------
-- SAFEGUARDING: REPORTS
-------------------------

CREATE TYPE safeguarding_report_status AS ENUM ('pending', 'reviewing', 'resolved', 'escalated');
CREATE TYPE safeguarding_report_type AS ENUM ('concern', 'misconduct', 'safety', 'other');

CREATE TABLE IF NOT EXISTS public.safeguarding_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporter_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  collaboration_id UUID REFERENCES public.collaborations(id) ON DELETE SET NULL,
  focus_id UUID REFERENCES public.focuses(id) ON DELETE SET NULL,
  report_type safeguarding_report_type NOT NULL DEFAULT 'concern',
  description TEXT NOT NULL,
  status safeguarding_report_status NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.safeguarding_reports IS 'Reports for safeguarding concerns within collaborations';

CREATE INDEX IF NOT EXISTS idx_safeguarding_reports_org ON public.safeguarding_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_safeguarding_reports_status ON public.safeguarding_reports(status);
CREATE INDEX IF NOT EXISTS idx_safeguarding_reports_reporter ON public.safeguarding_reports(reporter_profile_id);

-------------------------
-- ENHANCE MATCHES TABLE
-------------------------

-- Add fields for manual pairing by counselor
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS collaboration_id UUID REFERENCES public.collaborations(id),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.matches.created_by IS 'Counselor who created this match';
COMMENT ON COLUMN public.matches.collaboration_id IS 'The collaboration created from this match';
COMMENT ON COLUMN public.matches.notes IS 'Notes from counselor about the pairing';

-------------------------
-- ENHANCE PROGRAMS
-------------------------

-- Add term/semester info
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS term TEXT,
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.programs.term IS 'Academic term (e.g., Fall 2024, Spring 2025)';
COMMENT ON COLUMN public.programs.academic_year IS 'Academic year (e.g., 2024-2025)';
COMMENT ON COLUMN public.programs.is_active IS 'Whether the program is currently active';

-------------------------
-- RLS POLICIES
-------------------------

ALTER TABLE public.safeguarding_reports ENABLE ROW LEVEL SECURITY;

-- Org admins can view and manage reports in their org
CREATE POLICY "Org admins can view safeguarding reports"
  ON public.safeguarding_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = safeguarding_reports.org_id
      AND om.profile_id = auth.get_profile_id()
      AND om.role = 'admin'
    )
  );

-- Org admins can update reports in their org
CREATE POLICY "Org admins can update safeguarding reports"
  ON public.safeguarding_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = safeguarding_reports.org_id
      AND om.profile_id = auth.get_profile_id()
      AND om.role = 'admin'
    )
  );

-- Users can create reports
CREATE POLICY "Users can create safeguarding reports"
  ON public.safeguarding_reports
  FOR INSERT
  WITH CHECK (reporter_profile_id = auth.get_profile_id());

-- Service role can manage all reports
CREATE POLICY "Service role can manage safeguarding reports"
  ON public.safeguarding_reports
  FOR ALL
  USING (auth.role() = 'service_role');

-- Org admins can view goals in their org
CREATE POLICY "Org admins can view org member goals"
  ON public.goals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members admin_om
      JOIN public.org_members member_om ON admin_om.org_id = member_om.org_id
      WHERE admin_om.profile_id = auth.get_profile_id()
      AND admin_om.role = 'admin'
      AND member_om.profile_id = goals.profile_id
    )
  );

-- Org admins can view collaborations in their org
CREATE POLICY "Org admins can view org collaborations"
  ON public.collaborations
  FOR SELECT
  USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = collaborations.org_id
      AND om.profile_id = auth.get_profile_id()
      AND om.role = 'admin'
    )
  );

-- Org admins can view focuses in org collaborations
CREATE POLICY "Org admins can view org focuses"
  ON public.focuses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      JOIN public.org_members om ON om.org_id = c.org_id
      WHERE c.id = focuses.collaboration_id
      AND om.profile_id = auth.get_profile_id()
      AND om.role = 'admin'
    )
  );

-- Org admins can view focus agendas/notes in org
CREATE POLICY "Org admins can view org focus agendas"
  ON public.focus_agendas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      JOIN public.org_members om ON om.org_id = c.org_id
      WHERE f.id = focus_agendas.focus_id
      AND om.profile_id = auth.get_profile_id()
      AND om.role = 'admin'
    )
  );

-- Org admins can view focus grades in org
CREATE POLICY "Org admins can view org focus grades"
  ON public.focus_grades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      JOIN public.org_members om ON om.org_id = c.org_id
      WHERE f.id = focus_grades.focus_id
      AND om.profile_id = auth.get_profile_id()
      AND om.role = 'admin'
    )
  );

-- Org admins can view action items in org
CREATE POLICY "Org admins can view org action items"
  ON public.action_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      JOIN public.org_members om ON om.org_id = c.org_id
      WHERE c.id = action_items.collaboration_id
      AND om.profile_id = auth.get_profile_id()
      AND om.role = 'admin'
    )
  );

-------------------------
-- UPDATED_AT TRIGGERS
-------------------------

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_members_updated_at ON public.org_members;
CREATE TRIGGER update_org_members_updated_at
  BEFORE UPDATE ON public.org_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_programs_updated_at ON public.programs;
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON public.matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_safeguarding_reports_updated_at ON public.safeguarding_reports;
CREATE TRIGGER update_safeguarding_reports_updated_at
  BEFORE UPDATE ON public.safeguarding_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
