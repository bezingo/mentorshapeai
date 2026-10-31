-- Migration: B6 Sessions - Recording consent, notes, enhanced grading
-- Adds recording consent tracking, session notes, and safeguarding for minors

-- =====================================================
-- RECORDING CONSENT
-- =====================================================

CREATE TYPE recording_consent_status AS ENUM ('pending', 'granted', 'denied', 'revoked');

CREATE TABLE IF NOT EXISTS public.focus_recording_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  focus_id UUID NOT NULL REFERENCES public.focuses(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status recording_consent_status NOT NULL DEFAULT 'pending',
  ip_address INET,
  user_agent TEXT,
  consented_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_consent_per_focus_user UNIQUE (focus_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_focus_recording_consents_focus ON public.focus_recording_consents(focus_id);
CREATE INDEX IF NOT EXISTS idx_focus_recording_consents_profile ON public.focus_recording_consents(profile_id);

ALTER TABLE public.focus_recording_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recording consents"
  ON public.focus_recording_consents FOR SELECT
  USING (profile_id = public.get_profile_id());

CREATE POLICY "Users can view consents in their collaborations"
  ON public.focus_recording_consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      WHERE f.id = focus_recording_consents.focus_id
      AND (c.mentor_profile_id = public.get_profile_id() OR c.mentee_profile_id = public.get_profile_id())
    )
  );

CREATE POLICY "Users can create own recording consents"
  ON public.focus_recording_consents FOR INSERT
  WITH CHECK (profile_id = public.get_profile_id());

CREATE POLICY "Users can update own recording consents"
  ON public.focus_recording_consents FOR UPDATE
  USING (profile_id = public.get_profile_id());

CREATE POLICY "Service role manages recording consents"
  ON public.focus_recording_consents FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.focus_recording_consents IS 'Tracks recording consent for each participant in a focus';
COMMENT ON COLUMN public.focus_recording_consents.status IS 'Consent status: pending, granted, denied, revoked';

-- =====================================================
-- ADD RECORDING FIELDS TO FOCUSES
-- =====================================================

ALTER TABLE public.focuses
  ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recording_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recording_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS transcript_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS has_minor_participant BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.focuses.recording_enabled IS 'Whether recording is enabled (only if both consented and no minors)';
COMMENT ON COLUMN public.focuses.has_minor_participant IS 'True if any participant is a minor (no recording allowed)';

-- =====================================================
-- SESSION NOTES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.focus_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  focus_id UUID NOT NULL REFERENCES public.focuses(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT focus_notes_valid_type CHECK (note_type IN ('general', 'preparation', 'action_item', 'followup'))
);

CREATE INDEX IF NOT EXISTS idx_focus_notes_focus ON public.focus_notes(focus_id);
CREATE INDEX IF NOT EXISTS idx_focus_notes_profile ON public.focus_notes(profile_id);

ALTER TABLE public.focus_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
  ON public.focus_notes FOR SELECT
  USING (profile_id = public.get_profile_id());

CREATE POLICY "Users can view shared notes in their collaborations"
  ON public.focus_notes FOR SELECT
  USING (
    is_private = FALSE
    AND EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      WHERE f.id = focus_notes.focus_id
      AND (c.mentor_profile_id = public.get_profile_id() OR c.mentee_profile_id = public.get_profile_id())
    )
  );

CREATE POLICY "Users can create notes in their collaborations"
  ON public.focus_notes FOR INSERT
  WITH CHECK (
    profile_id = public.get_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      WHERE f.id = focus_id
      AND (c.mentor_profile_id = public.get_profile_id() OR c.mentee_profile_id = public.get_profile_id())
    )
  );

CREATE POLICY "Users can update own notes"
  ON public.focus_notes FOR UPDATE
  USING (profile_id = public.get_profile_id());

CREATE POLICY "Users can delete own notes"
  ON public.focus_notes FOR DELETE
  USING (profile_id = public.get_profile_id());

CREATE POLICY "Service role manages notes"
  ON public.focus_notes FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.focus_notes IS 'Notes taken by participants during or about a focus session';
COMMENT ON COLUMN public.focus_notes.note_type IS 'Type: general, preparation, action_item, followup';
COMMENT ON COLUMN public.focus_notes.is_private IS 'If true, only visible to the note creator';

-- =====================================================
-- HELPER: CHECK IF PARTICIPANT IS MINOR
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_minor(p_profile_id UUID, p_min_age INTEGER DEFAULT 18)
RETURNS BOOLEAN AS $$
DECLARE
  birth_date DATE;
  age_years INTEGER;
BEGIN
  SELECT date_of_birth INTO birth_date
  FROM public.profiles
  WHERE id = p_profile_id;
  
  IF birth_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  age_years := EXTRACT(YEAR FROM age(CURRENT_DATE, birth_date));
  RETURN age_years < p_min_age;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- HELPER: CHECK RECORDING ELIGIBILITY
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_recording_eligibility(p_focus_id UUID)
RETURNS TABLE (
  eligible BOOLEAN,
  reason TEXT,
  mentor_consent_status TEXT,
  mentee_consent_status TEXT,
  has_minor BOOLEAN
) AS $$
DECLARE
  focus_record RECORD;
  collab_record RECORD;
  mentor_is_minor BOOLEAN;
  mentee_is_minor BOOLEAN;
  mentor_consent TEXT;
  mentee_consent TEXT;
BEGIN
  SELECT f.*, c.mentor_profile_id, c.mentee_profile_id, c.org_id
  INTO focus_record
  FROM public.focuses f
  JOIN public.collaborations c ON c.id = f.collaboration_id
  WHERE f.id = p_focus_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Focus not found'::TEXT, NULL::TEXT, NULL::TEXT, NULL::BOOLEAN;
    RETURN;
  END IF;
  
  mentor_is_minor := public.is_minor(focus_record.mentor_profile_id);
  mentee_is_minor := public.is_minor(focus_record.mentee_profile_id);
  
  IF COALESCE(mentor_is_minor, FALSE) OR COALESCE(mentee_is_minor, FALSE) THEN
    RETURN QUERY SELECT FALSE, 'Recording not allowed - minor participant'::TEXT, NULL::TEXT, NULL::TEXT, TRUE;
    RETURN;
  END IF;
  
  SELECT status::TEXT INTO mentor_consent
  FROM public.focus_recording_consents
  WHERE focus_id = p_focus_id AND profile_id = focus_record.mentor_profile_id;
  
  SELECT status::TEXT INTO mentee_consent
  FROM public.focus_recording_consents
  WHERE focus_id = p_focus_id AND profile_id = focus_record.mentee_profile_id;
  
  IF COALESCE(mentor_consent, 'pending') != 'granted' OR COALESCE(mentee_consent, 'pending') != 'granted' THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Recording requires both parties consent'::TEXT, 
      COALESCE(mentor_consent, 'pending'), 
      COALESCE(mentee_consent, 'pending'),
      FALSE;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Recording eligible'::TEXT, mentor_consent, mentee_consent, FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- TRIGGER: UPDATE HAS_MINOR_PARTICIPANT
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_focus_minor_status()
RETURNS TRIGGER AS $$
DECLARE
  mentor_is_minor BOOLEAN;
  mentee_is_minor BOOLEAN;
  mentor_id UUID;
  mentee_id UUID;
BEGIN
  SELECT c.mentor_profile_id, c.mentee_profile_id
  INTO mentor_id, mentee_id
  FROM public.collaborations c
  WHERE c.id = NEW.collaboration_id;
  
  mentor_is_minor := COALESCE(public.is_minor(mentor_id), FALSE);
  mentee_is_minor := COALESCE(public.is_minor(mentee_id), FALSE);
  
  NEW.has_minor_participant := mentor_is_minor OR mentee_is_minor;
  
  IF NEW.has_minor_participant THEN
    NEW.recording_enabled := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_focus_minor_status ON public.focuses;
CREATE TRIGGER trigger_update_focus_minor_status
  BEFORE INSERT OR UPDATE ON public.focuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_focus_minor_status();

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_focus_recording_consents_updated_at ON public.focus_recording_consents;
CREATE TRIGGER update_focus_recording_consents_updated_at
  BEFORE UPDATE ON public.focus_recording_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_focus_notes_updated_at ON public.focus_notes;
CREATE TRIGGER update_focus_notes_updated_at
  BEFORE UPDATE ON public.focus_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
