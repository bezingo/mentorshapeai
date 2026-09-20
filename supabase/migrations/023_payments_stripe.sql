-- 020_payments_stripe.sql
-- Stripe Connect mentor payouts, transaction metadata, webhook idempotency

-------------------------
-- PROFILES: Stripe Connect
-------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_connect_account
  ON public.profiles(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.stripe_connect_account_id IS 'Stripe Connect Express account ID for mentor payouts';

-------------------------
-- MENTOR OFFERS: Stripe catalog
-------------------------

ALTER TABLE public.mentor_offers
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

COMMENT ON COLUMN public.mentor_offers.stripe_price_id IS 'Stripe Price ID for paid offers';

-------------------------
-- TRANSACTIONS: focus link + refunds
-------------------------

ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'refunded';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS focus_id UUID REFERENCES public.focuses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_payment_intent
  ON public.transactions(stripe_payment_intent_id);

-------------------------
-- STRIPE WEBHOOK IDEMPOTENCY
-------------------------

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages stripe webhook events"
  ON public.stripe_webhook_events FOR ALL
  USING (true)
  WITH CHECK (true);

-------------------------
-- MENTOR PAYOUTS (audit log)
-------------------------

CREATE TABLE IF NOT EXISTS public.mentor_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_payout_id TEXT NOT NULL UNIQUE,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  arrival_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_payouts_profile
  ON public.mentor_payouts(mentor_profile_id, created_at DESC);

ALTER TABLE public.mentor_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can view own payouts"
  ON public.mentor_payouts FOR SELECT
  USING (mentor_profile_id = auth.get_profile_id());

CREATE POLICY "Service role manages mentor payouts"
  ON public.mentor_payouts FOR ALL
  USING (true)
  WITH CHECK (true);

-------------------------
-- FOCUSES: pending payment
-------------------------

ALTER TABLE public.focuses DROP CONSTRAINT IF EXISTS focuses_valid_status;

ALTER TABLE public.focuses
  ADD CONSTRAINT focuses_valid_status CHECK (
    status IN ('pending_payment', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')
  );

-------------------------
-- DIGITAL PRODUCTS STORAGE
-------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-products', 'digital-products', false)
ON CONFLICT (id) DO NOTHING;
