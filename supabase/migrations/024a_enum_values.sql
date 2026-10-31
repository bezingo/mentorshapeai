-- Migration: 024a Enum Values
-- Adds new enum values that will be used in subsequent migrations.
-- These must be committed before the values can be used, per PostgreSQL requirements.

-- =====================================================
-- ORG_MEMBER_ROLE ENUM VALUES
-- Used in migration 025_b2_org_workspace_affiliations
-- =====================================================

DO $$
BEGIN
  -- Add 'owner' role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' AND enumtypid = 'org_member_role'::regtype) THEN
    ALTER TYPE org_member_role ADD VALUE IF NOT EXISTS 'owner';
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

DO $$
BEGIN
  -- Add 'career_office' role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'career_office' AND enumtypid = 'org_member_role'::regtype) THEN
    ALTER TYPE org_member_role ADD VALUE IF NOT EXISTS 'career_office';
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

DO $$
BEGIN
  -- Add 'faculty' role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'faculty' AND enumtypid = 'org_member_role'::regtype) THEN
    ALTER TYPE org_member_role ADD VALUE IF NOT EXISTS 'faculty';
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- =====================================================
-- MATCH_STATUS ENUM VALUES
-- Used in migration 026_b3_programmes_pairing
-- =====================================================

DO $$
BEGIN
  -- Add 'approved' status
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'approved' AND enumtypid = 'match_status'::regtype) THEN
    ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'approved';
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

DO $$
BEGIN
  -- Add 'intro_sent' status
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'intro_sent' AND enumtypid = 'match_status'::regtype) THEN
    ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'intro_sent';
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

DO $$
BEGIN
  -- Add 'accepted' status
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'accepted' AND enumtypid = 'match_status'::regtype) THEN
    ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'accepted';
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;
