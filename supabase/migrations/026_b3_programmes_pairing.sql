-- Migration: B3 Programmes and Mentor-Mentee Pairing
-- Adds match reasons, approval workflow, and both-accept gate

-- =====================================================
-- ENHANCE MATCHES TABLE
-- =====================================================

-- Add approval and acceptance fields
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS reasons TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mentee_accept BOOLEAN,
  ADD COLUMN IF NOT EXISTS mentee_accept_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mentor_accept BOOLEAN,
  ADD COLUMN IF NOT EXISTS mentor_accept_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intro_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_reason TEXT,
  ADD COLUMN IF NOT EXISTS swap_for UUID REFERENCES public.matches(id);

-- Update match_status enum if needed (add 'approved', 'intro_sent', 'accepted', 'declined')
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'approved' AND enumtypid = 'match_status'::regtype) THEN
    ALTER TYPE match_status ADD VALUE 'approved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'intro_sent' AND enumtypid = 'match_status'::regtype) THEN
    ALTER TYPE match_status ADD VALUE 'intro_sent';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'accepted' AND enumtypid = 'match_status'::regtype) THEN
    ALTER TYPE match_status ADD VALUE 'accepted';
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMENT ON COLUMN public.matches.reasons IS 'Array of match reasons (goal_match, programme_match, language_match, capacity_available)';
COMMENT ON COLUMN public.matches.approved_by IS 'Admin who approved this match';
COMMENT ON COLUMN public.matches.approved_at IS 'When the match was approved by admin';
COMMENT ON COLUMN public.matches.mentee_accept IS 'Whether mentee accepted the match';
COMMENT ON COLUMN public.matches.mentee_accept_at IS 'When mentee responded to the match';
COMMENT ON COLUMN public.matches.mentor_accept IS 'Whether mentor accepted the match';
COMMENT ON COLUMN public.matches.mentor_accept_at IS 'When mentor responded to the match';
COMMENT ON COLUMN public.matches.intro_sent_at IS 'When the introduction email was sent';
COMMENT ON COLUMN public.matches.declined_reason IS 'Reason if either party declined';
COMMENT ON COLUMN public.matches.swap_for IS 'If this match is a swap, references the original match';

CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_approved_by ON public.matches(approved_by);

-- =====================================================
-- ENHANCE PROGRAMS TABLE
-- =====================================================

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS max_mentees_per_mentor INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS matching_criteria JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS intro_template TEXT,
  ADD COLUMN IF NOT EXISTS intro_template_ar TEXT;

COMMENT ON COLUMN public.programs.max_mentees_per_mentor IS 'Maximum number of mentees a mentor can have in this program';
COMMENT ON COLUMN public.programs.matching_criteria IS 'JSON criteria for matching (categories, languages, etc.)';
COMMENT ON COLUMN public.programs.intro_template IS 'Email template for introductions (EN)';
COMMENT ON COLUMN public.programs.intro_template_ar IS 'Email template for introductions (AR)';

-- =====================================================
-- MATCH POOL VIEW
-- =====================================================

-- View for unmatched participants who can be reassigned
CREATE OR REPLACE VIEW public.match_pool AS
SELECT 
  pp.id as participant_id,
  pp.program_id,
  pp.profile_id,
  pp.role,
  p.display_name,
  p.avatar_url,
  p.locale,
  COALESCE(
    (SELECT jsonb_agg(og.category) FROM public.onboarding_goals og WHERE og.profile_id = pp.profile_id),
    '[]'::jsonb
  ) as goal_categories,
  CASE 
    WHEN pp.role = 'mentor' THEN (
      SELECT COUNT(*) FROM public.matches m 
      WHERE m.mentor_profile_id = pp.profile_id 
      AND m.program_id = pp.program_id 
      AND m.status IN ('proposed', 'approved', 'intro_sent', 'accepted', 'confirmed')
    )
    ELSE 0
  END as current_mentee_count,
  NOT EXISTS (
    SELECT 1 FROM public.matches m 
    WHERE (
      (pp.role = 'mentee' AND m.mentee_profile_id = pp.profile_id) OR
      (pp.role = 'mentor' AND m.mentor_profile_id = pp.profile_id AND m.status IN ('confirmed', 'accepted'))
    )
    AND m.program_id = pp.program_id
    AND m.status NOT IN ('declined')
  ) as available_for_matching
FROM public.program_participants pp
JOIN public.profiles p ON p.id = pp.profile_id;

-- =====================================================
-- MATCH SUGGESTIONS FUNCTION
-- =====================================================

-- Function to generate match suggestions based on rules
CREATE OR REPLACE FUNCTION public.generate_match_suggestions(
  p_program_id UUID,
  p_mentee_profile_id UUID DEFAULT NULL
)
RETURNS TABLE (
  mentee_profile_id UUID,
  mentor_profile_id UUID,
  match_score DOUBLE PRECISION,
  reasons TEXT[]
) AS $$
DECLARE
  program_record RECORD;
  max_per_mentor INTEGER;
BEGIN
  -- Get program settings
  SELECT * INTO program_record FROM public.programs WHERE id = p_program_id;
  max_per_mentor := COALESCE(program_record.max_mentees_per_mentor, 3);

  RETURN QUERY
  WITH mentee_pool AS (
    SELECT 
      pp.profile_id,
      COALESCE(
        (SELECT array_agg(og.category::text) FROM public.onboarding_goals og WHERE og.profile_id = pp.profile_id),
        '{}'::text[]
      ) as categories,
      p.locale
    FROM public.program_participants pp
    JOIN public.profiles p ON p.id = pp.profile_id
    WHERE pp.program_id = p_program_id
    AND pp.role = 'mentee'
    AND (p_mentee_profile_id IS NULL OR pp.profile_id = p_mentee_profile_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.matches m 
      WHERE m.mentee_profile_id = pp.profile_id 
      AND m.program_id = p_program_id
      AND m.status NOT IN ('declined')
    )
  ),
  mentor_pool AS (
    SELECT 
      pp.profile_id,
      COALESCE(
        (SELECT array_agg(DISTINCT mo.category) FROM public.mentor_offers mo WHERE mo.profile_id = pp.profile_id AND mo.is_active),
        '{}'::text[]
      ) as offer_categories,
      p.locale,
      (
        SELECT COUNT(*) FROM public.matches m 
        WHERE m.mentor_profile_id = pp.profile_id 
        AND m.program_id = p_program_id
        AND m.status NOT IN ('declined')
      ) as current_count
    FROM public.program_participants pp
    JOIN public.profiles p ON p.id = pp.profile_id
    WHERE pp.program_id = p_program_id
    AND pp.role = 'mentor'
  )
  SELECT 
    me.profile_id as mentee_profile_id,
    mt.profile_id as mentor_profile_id,
    -- Calculate score
    (
      CASE WHEN me.categories && mt.offer_categories THEN 0.4 ELSE 0 END +
      CASE WHEN me.locale = mt.locale THEN 0.3 ELSE 0 END +
      CASE WHEN mt.current_count < max_per_mentor THEN 0.3 ELSE 0 END
    ) as match_score,
    -- Build reasons array
    ARRAY_REMOVE(ARRAY[
      CASE WHEN me.categories && mt.offer_categories THEN 'goal_match' ELSE NULL END,
      CASE WHEN me.locale = mt.locale THEN 'language_match' ELSE NULL END,
      CASE WHEN mt.current_count < max_per_mentor THEN 'capacity_available' ELSE NULL END,
      'programme_match'
    ], NULL) as reasons
  FROM mentee_pool me
  CROSS JOIN mentor_pool mt
  WHERE mt.current_count < max_per_mentor
  ORDER BY 
    (
      CASE WHEN me.categories && mt.offer_categories THEN 0.4 ELSE 0 END +
      CASE WHEN me.locale = mt.locale THEN 0.3 ELSE 0 END +
      CASE WHEN mt.current_count < max_per_mentor THEN 0.3 ELSE 0 END
    ) DESC,
    mt.current_count ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- MATCH INTRO EMAIL TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.match_intros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sent_to TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_match_intros_match ON public.match_intros(match_id);

ALTER TABLE public.match_intros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages match_intros"
  ON public.match_intros FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.match_intros IS 'Tracking for match introduction emails';

-- =====================================================
-- HELPER FUNCTION: CHECK BOTH-ACCEPT
-- =====================================================

-- Function to check if both parties have accepted and create collaboration
CREATE OR REPLACE FUNCTION public.check_match_both_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mentee_accept = TRUE AND NEW.mentor_accept = TRUE THEN
    -- Update match status to accepted
    NEW.status := 'accepted';
    
    -- Create collaboration if not exists
    IF NOT EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE EXISTS (
        SELECT 1 FROM public.matches m 
        WHERE m.id = NEW.id 
        AND m.collaboration_id = c.id
      )
    ) THEN
      INSERT INTO public.collaborations (
        mentor_profile_id,
        mentee_profile_id,
        org_id,
        status
      )
      SELECT 
        NEW.mentor_profile_id,
        NEW.mentee_profile_id,
        pr.org_id,
        'active'
      FROM public.programs pr
      WHERE pr.id = NEW.program_id
      RETURNING id INTO NEW.collaboration_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_match_both_accept ON public.matches;
CREATE TRIGGER trigger_match_both_accept
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  WHEN (NEW.mentee_accept IS DISTINCT FROM OLD.mentee_accept OR NEW.mentor_accept IS DISTINCT FROM OLD.mentor_accept)
  EXECUTE FUNCTION public.check_match_both_accept();

-- =====================================================
-- ORG DASHBOARD STATS
-- =====================================================

-- Function to get program statistics
CREATE OR REPLACE FUNCTION public.get_program_stats(p_program_id UUID)
RETURNS TABLE (
  total_participants INTEGER,
  total_mentors INTEGER,
  total_mentees INTEGER,
  pending_matches INTEGER,
  approved_matches INTEGER,
  accepted_matches INTEGER,
  declined_matches INTEGER,
  unmatched_mentees INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM public.program_participants WHERE program_id = p_program_id),
    (SELECT COUNT(*)::INTEGER FROM public.program_participants WHERE program_id = p_program_id AND role = 'mentor'),
    (SELECT COUNT(*)::INTEGER FROM public.program_participants WHERE program_id = p_program_id AND role = 'mentee'),
    (SELECT COUNT(*)::INTEGER FROM public.matches WHERE program_id = p_program_id AND status = 'proposed'),
    (SELECT COUNT(*)::INTEGER FROM public.matches WHERE program_id = p_program_id AND status = 'approved'),
    (SELECT COUNT(*)::INTEGER FROM public.matches WHERE program_id = p_program_id AND status IN ('accepted', 'confirmed')),
    (SELECT COUNT(*)::INTEGER FROM public.matches WHERE program_id = p_program_id AND status = 'declined'),
    (
      SELECT COUNT(*)::INTEGER 
      FROM public.program_participants pp 
      WHERE pp.program_id = p_program_id 
      AND pp.role = 'mentee'
      AND NOT EXISTS (
        SELECT 1 FROM public.matches m 
        WHERE m.mentee_profile_id = pp.profile_id 
        AND m.program_id = p_program_id
        AND m.status NOT IN ('declined')
      )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
