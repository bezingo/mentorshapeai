-- Migration: B2 Org Workspace, Invites, Affiliations & Verification
-- Adds organization workspace management, expanded invite system, affiliations, and verification

-- =====================================================
-- ORG_MEMBERS ROLES
-- =====================================================
-- NOTE: New enum values (owner, career_office, faculty) are added in 024a_enum_values.sql

-- =====================================================
-- ENHANCE ORGANIZATIONS TABLE
-- =====================================================

-- Add workspace management fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS crest_url TEXT,
  ADD COLUMN IF NOT EXISTS verified_domains TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS domain_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_link_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_link_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_members INTEGER,
  ADD COLUMN IF NOT EXISTS billing_email TEXT;

-- Create unique index for invite link codes
CREATE INDEX IF NOT EXISTS idx_organizations_invite_link_code 
  ON public.organizations(invite_link_code) WHERE invite_link_code IS NOT NULL;

COMMENT ON COLUMN public.organizations.crest_url IS 'URL of the organization crest/logo';
COMMENT ON COLUMN public.organizations.verified_domains IS 'Email domains that have been verified for auto-join';
COMMENT ON COLUMN public.organizations.domain_verification_token IS 'Token for DNS-based domain verification';
COMMENT ON COLUMN public.organizations.domain_verified_at IS 'When the domain was verified';
COMMENT ON COLUMN public.organizations.invite_link_code IS 'Unique code for the public invite link';
COMMENT ON COLUMN public.organizations.invite_link_enabled IS 'Whether the public invite link is active';
COMMENT ON COLUMN public.organizations.max_members IS 'Maximum number of members (null = unlimited)';
COMMENT ON COLUMN public.organizations.billing_email IS 'Email for billing notifications';

-- =====================================================
-- ENHANCE ORG_INVITES TABLE (CREATED IN B1)
-- =====================================================

-- Add additional fields for tracking and i18n
ALTER TABLE public.org_invites
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounce_reason TEXT,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update status to include more states
-- Note: We'll use TEXT for flexibility since the column already exists as TEXT

CREATE INDEX IF NOT EXISTS idx_org_invites_status ON public.org_invites(status);
CREATE INDEX IF NOT EXISTS idx_org_invites_bounced ON public.org_invites(bounced_at) WHERE bounced_at IS NOT NULL;

COMMENT ON COLUMN public.org_invites.language IS 'Language for invite email (en/ar)';
COMMENT ON COLUMN public.org_invites.sent_at IS 'When the invite email was sent';
COMMENT ON COLUMN public.org_invites.bounced_at IS 'When the email bounced (if applicable)';
COMMENT ON COLUMN public.org_invites.bounce_reason IS 'Reason for email bounce';
COMMENT ON COLUMN public.org_invites.reminder_sent_at IS 'When a reminder was sent';
COMMENT ON COLUMN public.org_invites.created_by IS 'Profile who created this invite';
COMMENT ON COLUMN public.org_invites.metadata IS 'Additional metadata (year_grade, department, etc.)';

-- =====================================================
-- AFFILIATIONS TABLE
-- =====================================================

-- Affiliation kind
CREATE TYPE affiliation_kind AS ENUM ('student', 'alumni', 'staff', 'faculty');

-- Affiliation status
CREATE TYPE affiliation_status AS ENUM ('pending', 'verified', 'rejected', 'expired');

CREATE TABLE IF NOT EXISTS public.affiliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind affiliation_kind NOT NULL,
  programme_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  graduation_year INTEGER,
  department TEXT,
  student_id TEXT,
  status affiliation_status NOT NULL DEFAULT 'pending',
  evidence_url TEXT,
  evidence_notes TEXT,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliations_profile ON public.affiliations(profile_id);
CREATE INDEX IF NOT EXISTS idx_affiliations_org ON public.affiliations(org_id);
CREATE INDEX IF NOT EXISTS idx_affiliations_status ON public.affiliations(status);
CREATE INDEX IF NOT EXISTS idx_affiliations_kind ON public.affiliations(kind);

COMMENT ON TABLE public.affiliations IS 'User affiliations with organizations (student, alumni, staff, faculty)';
COMMENT ON COLUMN public.affiliations.kind IS 'Type of affiliation: student, alumni, staff, or faculty';
COMMENT ON COLUMN public.affiliations.programme_id IS 'The programme they are/were enrolled in';
COMMENT ON COLUMN public.affiliations.graduation_year IS 'Year of graduation (for alumni)';
COMMENT ON COLUMN public.affiliations.department IS 'Department or faculty';
COMMENT ON COLUMN public.affiliations.student_id IS 'Student ID number';
COMMENT ON COLUMN public.affiliations.status IS 'Verification status: pending, verified, rejected, expired';
COMMENT ON COLUMN public.affiliations.evidence_url IS 'URL to uploaded evidence (ID card, diploma, etc.)';
COMMENT ON COLUMN public.affiliations.evidence_notes IS 'Notes about the evidence provided';
COMMENT ON COLUMN public.affiliations.verified_by IS 'Admin who verified this affiliation';

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_affiliations_updated_at ON public.affiliations;
CREATE TRIGGER update_affiliations_updated_at
  BEFORE UPDATE ON public.affiliations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION CODES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,
  email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON public.verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_profile ON public.verification_codes(profile_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON public.verification_codes(expires_at);

COMMENT ON TABLE public.verification_codes IS 'Email verification codes for various purposes';
COMMENT ON COLUMN public.verification_codes.purpose IS 'Purpose: email_verify, affiliation_verify, domain_verify, etc.';

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.affiliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Affiliations: Users can view their own
CREATE POLICY "Users can view own affiliations"
  ON public.affiliations FOR SELECT
  USING (profile_id = public.get_profile_id());

-- Affiliations: Users can create their own
CREATE POLICY "Users can create own affiliations"
  ON public.affiliations FOR INSERT
  WITH CHECK (profile_id = public.get_profile_id());

-- Affiliations: Users can update their own pending affiliations
CREATE POLICY "Users can update own pending affiliations"
  ON public.affiliations FOR UPDATE
  USING (profile_id = public.get_profile_id() AND status = 'pending');

-- Affiliations: Org admins can view all in their org
CREATE POLICY "Org admins can view org affiliations"
  ON public.affiliations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = affiliations.org_id
      AND om.profile_id = public.get_profile_id()
      AND om.role IN ('owner', 'admin', 'career_office')
    )
  );

-- Affiliations: Org admins can update affiliations in their org
CREATE POLICY "Org admins can update org affiliations"
  ON public.affiliations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = affiliations.org_id
      AND om.profile_id = public.get_profile_id()
      AND om.role IN ('owner', 'admin', 'career_office')
    )
  );

-- Service role can manage all affiliations
CREATE POLICY "Service role manages affiliations"
  ON public.affiliations FOR ALL
  USING (auth.role() = 'service_role');

-- Verification codes: Users can view their own
CREATE POLICY "Users can view own verification codes"
  ON public.verification_codes FOR SELECT
  USING (profile_id = public.get_profile_id());

-- Service role manages verification codes
CREATE POLICY "Service role manages verification codes"
  ON public.verification_codes FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- ORG INVITE POLICIES (ENHANCE EXISTING)
-- =====================================================

-- Org admins can view invites in their org
CREATE POLICY "Org admins can view org invites"
  ON public.org_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_invites.org_id
      AND om.profile_id = public.get_profile_id()
      AND om.role IN ('owner', 'admin', 'career_office')
    )
  );

-- Org admins can create invites for their org
CREATE POLICY "Org admins can create org invites"
  ON public.org_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_invites.org_id
      AND om.profile_id = public.get_profile_id()
      AND om.role IN ('owner', 'admin', 'career_office')
    )
  );

-- Org admins can update invites in their org
CREATE POLICY "Org admins can update org invites"
  ON public.org_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_invites.org_id
      AND om.profile_id = public.get_profile_id()
      AND om.role IN ('owner', 'admin', 'career_office')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if a domain matches org allowed domains
CREATE OR REPLACE FUNCTION public.check_email_domain_allowed(
  p_email TEXT,
  p_org_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  email_domain TEXT;
  allowed_domains TEXT[];
  verified_domains TEXT[];
  domain TEXT;
BEGIN
  -- Extract domain from email
  email_domain := split_part(p_email, '@', 2);
  
  -- Get both allowed and verified domains
  SELECT o.allowed_domains, o.verified_domains
  INTO allowed_domains, verified_domains
  FROM public.organizations o
  WHERE o.id = p_org_id;
  
  -- Check against both lists
  IF email_domain = ANY(allowed_domains) OR email_domain = ANY(verified_domains) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to find org by email domain
CREATE OR REPLACE FUNCTION public.find_org_by_email_domain(p_email TEXT)
RETURNS UUID AS $$
DECLARE
  email_domain TEXT;
  org_id UUID;
BEGIN
  email_domain := split_part(p_email, '@', 2);
  
  SELECT o.id INTO org_id
  FROM public.organizations o
  WHERE email_domain = ANY(o.allowed_domains)
     OR email_domain = ANY(o.verified_domains)
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to generate invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(encode(gen_random_bytes(4), 'hex'));
END;
$$ LANGUAGE plpgsql;

-- Function to generate invite link code for orgs
CREATE OR REPLACE FUNCTION public.generate_org_invite_link_code()
RETURNS TEXT AS $$
BEGIN
  RETURN lower(encode(gen_random_bytes(6), 'hex'));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ADD VERIFIED ALUMNI BADGE TO PROFILES
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_affiliations JSONB DEFAULT '[]';

COMMENT ON COLUMN public.profiles.verified_affiliations IS 'Cached array of verified affiliations for display';

-- Function to refresh verified affiliations cache
CREATE OR REPLACE FUNCTION public.refresh_verified_affiliations(p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET verified_affiliations = (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'org_id', a.org_id,
      'org_name', o.name,
      'kind', a.kind,
      'graduation_year', a.graduation_year,
      'verified_at', a.verified_at
    )), '[]'::jsonb)
    FROM public.affiliations a
    JOIN public.organizations o ON o.id = a.org_id
    WHERE a.profile_id = p_profile_id
    AND a.status = 'verified'
  )
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-refresh when affiliation is verified
CREATE OR REPLACE FUNCTION public.trigger_refresh_verified_affiliations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    PERFORM public.refresh_verified_affiliations(NEW.profile_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_affiliations_on_verify ON public.affiliations;
CREATE TRIGGER refresh_affiliations_on_verify
  AFTER UPDATE ON public.affiliations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_refresh_verified_affiliations();
