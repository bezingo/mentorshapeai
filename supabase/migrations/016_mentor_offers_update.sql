-- 016_mentor_offers_update.sql
-- Adds new columns to mentor_offers table and profiles table for mentor onboarding

-------------------------
-- MENTOR_OFFERS TABLE UPDATES
-------------------------

-- Add payment_required flag to indicate if offer needs Stripe Connect setup
ALTER TABLE public.mentor_offers
  ADD COLUMN IF NOT EXISTS payment_required BOOLEAN NOT NULL DEFAULT FALSE;

-- Add sort_order for custom ordering of offers on mentor profile
ALTER TABLE public.mentor_offers
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.mentor_offers.payment_required IS 'True if this paid offer requires Stripe Connect setup to be bookable';
COMMENT ON COLUMN public.mentor_offers.sort_order IS 'Display order of offers on mentor profile (lower = higher)';

-- Index for sorting offers
CREATE INDEX IF NOT EXISTS idx_mentor_offers_sort ON public.mentor_offers(mentor_profile_id, sort_order);

-------------------------
-- PROFILES TABLE UPDATES
-------------------------

-- Add column to track when mentor onboarding was completed
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mentor_onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.mentor_onboarding_completed_at IS 'Timestamp when mentor completed the onboarding wizard';

-- Index for querying mentors who completed onboarding
CREATE INDEX IF NOT EXISTS idx_profiles_mentor_onboarding ON public.profiles(mentor_onboarding_completed_at)
  WHERE is_mentor = TRUE AND mentor_onboarding_completed_at IS NOT NULL;
