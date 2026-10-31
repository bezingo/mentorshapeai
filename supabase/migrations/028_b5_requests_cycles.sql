-- Migration: B5 Requests and Cycles
-- Adds program cycles, mentee request flow, and request management

-- =====================================================
-- PROGRAM CYCLES
-- =====================================================

CREATE TYPE cycle_status AS ENUM ('draft', 'open', 'matching', 'active', 'completed');

CREATE TABLE IF NOT EXISTS public.program_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  request_deadline DATE,
  status cycle_status NOT NULL DEFAULT 'draft',
  max_requests_per_mentee INTEGER DEFAULT 3,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_cycles_program ON public.program_cycles(program_id);
CREATE INDEX IF NOT EXISTS idx_program_cycles_status ON public.program_cycles(status);
CREATE INDEX IF NOT EXISTS idx_program_cycles_dates ON public.program_cycles(start_date, end_date);

ALTER TABLE public.program_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cycles in their org programs"
  ON public.program_cycles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.programs p
      JOIN public.organizations o ON o.id = p.org_id
      JOIN public.affiliations a ON a.org_id = o.id
      WHERE p.id = program_cycles.program_id
      AND a.profile_id = public.get_profile_id()
      AND a.verified_at IS NOT NULL
    )
  );

CREATE POLICY "Admins can manage cycles"
  ON public.program_cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.programs p
      JOIN public.org_members om ON om.org_id = p.org_id
      WHERE p.id = program_cycles.program_id
      AND om.profile_id = public.get_profile_id()
      AND om.role IN ('admin', 'owner', 'counselor')
    )
  );

CREATE POLICY "Service role manages cycles"
  ON public.program_cycles FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.program_cycles IS 'Time-bounded cycles within programs (e.g., Fall 2026, Spring 2027)';
COMMENT ON COLUMN public.program_cycles.request_deadline IS 'Deadline for mentees to submit mentor requests';
COMMENT ON COLUMN public.program_cycles.max_requests_per_mentee IS 'Maximum mentor requests a mentee can make in this cycle';
COMMENT ON COLUMN public.program_cycles.settings IS 'Additional cycle settings (matching rules, visibility, etc.)';

-- =====================================================
-- MENTEE REQUESTS
-- =====================================================

CREATE TYPE request_status AS ENUM ('pending', 'approved', 'declined', 'expired', 'withdrawn', 'matched');

CREATE TABLE IF NOT EXISTS public.mentee_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID NOT NULL REFERENCES public.program_cycles(id) ON DELETE CASCADE,
  mentee_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'pending',
  request_message TEXT,
  goal_category TEXT,
  priority INTEGER DEFAULT 1,
  admin_notes TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  declined_reason TEXT,
  match_id UUID REFERENCES public.matches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_request_per_cycle UNIQUE (cycle_id, mentee_profile_id, mentor_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_mentee_requests_cycle ON public.mentee_requests(cycle_id);
CREATE INDEX IF NOT EXISTS idx_mentee_requests_mentee ON public.mentee_requests(mentee_profile_id);
CREATE INDEX IF NOT EXISTS idx_mentee_requests_mentor ON public.mentee_requests(mentor_profile_id);
CREATE INDEX IF NOT EXISTS idx_mentee_requests_status ON public.mentee_requests(status);

ALTER TABLE public.mentee_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentees can view own requests"
  ON public.mentee_requests FOR SELECT
  USING (mentee_profile_id = public.get_profile_id());

CREATE POLICY "Mentors can view requests for them"
  ON public.mentee_requests FOR SELECT
  USING (mentor_profile_id = public.get_profile_id());

CREATE POLICY "Admins can view all requests in their programs"
  ON public.mentee_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.program_cycles pc
      JOIN public.programs p ON p.id = pc.program_id
      JOIN public.org_members om ON om.org_id = p.org_id
      WHERE pc.id = mentee_requests.cycle_id
      AND om.profile_id = public.get_profile_id()
      AND om.role IN ('admin', 'owner', 'counselor')
    )
  );

CREATE POLICY "Mentees can create requests in open cycles"
  ON public.mentee_requests FOR INSERT
  WITH CHECK (
    mentee_profile_id = public.get_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.program_cycles pc
      WHERE pc.id = cycle_id
      AND pc.status = 'open'
      AND (pc.request_deadline IS NULL OR pc.request_deadline >= CURRENT_DATE)
    )
  );

CREATE POLICY "Mentees can update own pending requests"
  ON public.mentee_requests FOR UPDATE
  USING (
    mentee_profile_id = public.get_profile_id()
    AND status = 'pending'
  );

CREATE POLICY "Admins can manage all requests"
  ON public.mentee_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.program_cycles pc
      JOIN public.programs p ON p.id = pc.program_id
      JOIN public.org_members om ON om.org_id = p.org_id
      WHERE pc.id = mentee_requests.cycle_id
      AND om.profile_id = public.get_profile_id()
      AND om.role IN ('admin', 'owner', 'counselor')
    )
  );

CREATE POLICY "Service role manages requests"
  ON public.mentee_requests FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.mentee_requests IS 'Mentee requests for specific mentors within a program cycle';
COMMENT ON COLUMN public.mentee_requests.priority IS 'Request priority (1 = highest) for ranking multiple requests';
COMMENT ON COLUMN public.mentee_requests.goal_category IS 'Category this request is for (finance, career, etc.)';

-- =====================================================
-- REQUEST LIMITS ENFORCEMENT
-- =====================================================

-- Function to check request limits
CREATE OR REPLACE FUNCTION public.check_request_limits()
RETURNS TRIGGER AS $$
DECLARE
  max_requests INTEGER;
  current_count INTEGER;
BEGIN
  -- Get max requests for this cycle
  SELECT COALESCE(pc.max_requests_per_mentee, 3) INTO max_requests
  FROM public.program_cycles pc
  WHERE pc.id = NEW.cycle_id;

  -- Count existing non-withdrawn requests
  SELECT COUNT(*) INTO current_count
  FROM public.mentee_requests mr
  WHERE mr.cycle_id = NEW.cycle_id
  AND mr.mentee_profile_id = NEW.mentee_profile_id
  AND mr.status NOT IN ('withdrawn', 'expired', 'declined');

  IF current_count >= max_requests THEN
    RAISE EXCEPTION 'Maximum requests per cycle (%) reached', max_requests;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_request_limits ON public.mentee_requests;
CREATE TRIGGER trigger_check_request_limits
  BEFORE INSERT ON public.mentee_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_request_limits();

-- =====================================================
-- AVAILABLE MENTORS VIEW
-- =====================================================

-- View of mentors available for requests in a cycle
CREATE OR REPLACE VIEW public.available_cycle_mentors AS
SELECT 
  pc.id as cycle_id,
  pp.profile_id as mentor_profile_id,
  p.display_name,
  p.avatar_url,
  p.headline,
  p.bio,
  p.locale,
  p.expertise_areas,
  p.languages,
  COALESCE(
    (SELECT array_agg(DISTINCT mo.category) FROM public.mentor_offers mo WHERE mo.profile_id = pp.profile_id AND mo.is_active),
    '{}'::text[]
  ) as offer_categories,
  (
    SELECT COUNT(*) FROM public.matches m 
    WHERE m.mentor_profile_id = pp.profile_id 
    AND m.program_id = pc.program_id
    AND m.status NOT IN ('declined')
  ) as current_mentee_count,
  (
    SELECT COUNT(*) FROM public.mentee_requests mr 
    WHERE mr.mentor_profile_id = pp.profile_id 
    AND mr.cycle_id = pc.id
    AND mr.status = 'pending'
  ) as pending_request_count,
  pr.max_mentees_per_mentor
FROM public.program_cycles pc
JOIN public.programs pr ON pr.id = pc.program_id
JOIN public.program_participants pp ON pp.program_id = pc.program_id AND pp.role = 'mentor'
JOIN public.profiles p ON p.id = pp.profile_id
WHERE pc.status IN ('open', 'matching', 'active');

-- =====================================================
-- REQUEST STATS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_cycle_request_stats(p_cycle_id UUID)
RETURNS TABLE (
  total_requests INTEGER,
  pending_requests INTEGER,
  approved_requests INTEGER,
  declined_requests INTEGER,
  matched_requests INTEGER,
  unique_mentees INTEGER,
  unique_mentors INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM public.mentee_requests WHERE cycle_id = p_cycle_id),
    (SELECT COUNT(*)::INTEGER FROM public.mentee_requests WHERE cycle_id = p_cycle_id AND status = 'pending'),
    (SELECT COUNT(*)::INTEGER FROM public.mentee_requests WHERE cycle_id = p_cycle_id AND status = 'approved'),
    (SELECT COUNT(*)::INTEGER FROM public.mentee_requests WHERE cycle_id = p_cycle_id AND status = 'declined'),
    (SELECT COUNT(*)::INTEGER FROM public.mentee_requests WHERE cycle_id = p_cycle_id AND status = 'matched'),
    (SELECT COUNT(DISTINCT mentee_profile_id)::INTEGER FROM public.mentee_requests WHERE cycle_id = p_cycle_id),
    (SELECT COUNT(DISTINCT mentor_profile_id)::INTEGER FROM public.mentee_requests WHERE cycle_id = p_cycle_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- LINK MATCHES TO CYCLES
-- =====================================================

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.program_cycles(id);

CREATE INDEX IF NOT EXISTS idx_matches_cycle ON public.matches(cycle_id);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_program_cycles_updated_at ON public.program_cycles;
CREATE TRIGGER update_program_cycles_updated_at
  BEFORE UPDATE ON public.program_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mentee_requests_updated_at ON public.mentee_requests;
CREATE TRIGGER update_mentee_requests_updated_at
  BEFORE UPDATE ON public.mentee_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-EXPIRE REQUESTS
-- =====================================================

-- Function to expire requests after deadline
CREATE OR REPLACE FUNCTION public.expire_cycle_requests()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.mentee_requests mr
  SET status = 'expired', updated_at = NOW()
  FROM public.program_cycles pc
  WHERE mr.cycle_id = pc.id
  AND mr.status = 'pending'
  AND pc.request_deadline IS NOT NULL
  AND pc.request_deadline < CURRENT_DATE;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
