-- Migration: B7 Follow-through - Reminders, digest enhancements, guardian consent
-- Adds reminder scheduling, digest preferences, and guardian consent tracking

-- =====================================================
-- REMINDER SCHEDULES
-- =====================================================

CREATE TYPE reminder_type AS ENUM (
  'session_upcoming',
  'task_due',
  'check_in_due',
  'consent_pending',
  'collaboration_request',
  'match_response_pending'
);

CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reminder_type reminder_type NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status reminder_status NOT NULL DEFAULT 'pending',
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_profile ON public.scheduled_reminders(profile_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_scheduled ON public.scheduled_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_type ON public.scheduled_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_reference ON public.scheduled_reminders(reference_type, reference_id);

ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON public.scheduled_reminders FOR SELECT
  USING (profile_id = public.get_profile_id());

CREATE POLICY "Service role manages reminders"
  ON public.scheduled_reminders FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.scheduled_reminders IS 'Scheduled email reminders for various events';
COMMENT ON COLUMN public.scheduled_reminders.reference_type IS 'Type of entity (focus, action_item, match, etc.)';
COMMENT ON COLUMN public.scheduled_reminders.reference_id IS 'ID of the referenced entity';

-- =====================================================
-- DIGEST PREFERENCES
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS digest_frequency TEXT NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS digest_hour INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS reminder_email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.digest_enabled IS 'Whether to send digest emails';
COMMENT ON COLUMN public.profiles.digest_frequency IS 'Frequency: daily, weekly';
COMMENT ON COLUMN public.profiles.digest_hour IS 'Hour of day (UTC) to send digest (0-23)';
COMMENT ON COLUMN public.profiles.reminder_email_enabled IS 'Whether to send reminder emails';
COMMENT ON COLUMN public.profiles.last_digest_sent_at IS 'When the last digest was sent';

-- =====================================================
-- GUARDIAN CONSENT TRACKING
-- =====================================================

CREATE TYPE guardian_consent_status AS ENUM ('pending', 'approved', 'denied', 'expired');

CREATE TABLE IF NOT EXISTS public.guardian_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guardian_email TEXT NOT NULL,
  guardian_name TEXT,
  consent_token TEXT UNIQUE NOT NULL,
  status guardian_consent_status NOT NULL DEFAULT 'pending',
  email_sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  org_id UUID REFERENCES public.organizations(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardian_consents_profile ON public.guardian_consents(profile_id);
CREATE INDEX IF NOT EXISTS idx_guardian_consents_token ON public.guardian_consents(consent_token);
CREATE INDEX IF NOT EXISTS idx_guardian_consents_status ON public.guardian_consents(status) WHERE status = 'pending';

ALTER TABLE public.guardian_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own guardian consents"
  ON public.guardian_consents FOR SELECT
  USING (profile_id = public.get_profile_id());

CREATE POLICY "Service role manages guardian consents"
  ON public.guardian_consents FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.guardian_consents IS 'Tracks guardian consent requests and responses for minors';
COMMENT ON COLUMN public.guardian_consents.consent_token IS 'Unique token for consent verification URL';

-- =====================================================
-- AUTO-CREATE SESSION REMINDERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_session_reminders()
RETURNS TRIGGER AS $$
DECLARE
  collab_record RECORD;
  reminder_time TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'scheduled' AND NEW.scheduled_at IS NOT NULL THEN
    SELECT c.*, p1.reminder_email_enabled as mentor_reminders, p2.reminder_email_enabled as mentee_reminders
    INTO collab_record
    FROM public.collaborations c
    JOIN public.profiles p1 ON p1.id = c.mentor_profile_id
    JOIN public.profiles p2 ON p2.id = c.mentee_profile_id
    WHERE c.id = NEW.collaboration_id;
    
    reminder_time := NEW.scheduled_at - INTERVAL '1 day';
    
    IF reminder_time > NOW() AND collab_record.mentor_reminders THEN
      INSERT INTO public.scheduled_reminders (
        profile_id, reminder_type, scheduled_for, reference_type, reference_id, metadata
      ) VALUES (
        collab_record.mentor_profile_id, 'session_upcoming', reminder_time, 'focus', NEW.id,
        jsonb_build_object('scheduled_at', NEW.scheduled_at, 'duration_minutes', NEW.duration_minutes)
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF reminder_time > NOW() AND collab_record.mentee_reminders THEN
      INSERT INTO public.scheduled_reminders (
        profile_id, reminder_type, scheduled_for, reference_type, reference_id, metadata
      ) VALUES (
        collab_record.mentee_profile_id, 'session_upcoming', reminder_time, 'focus', NEW.id,
        jsonb_build_object('scheduled_at', NEW.scheduled_at, 'duration_minutes', NEW.duration_minutes)
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_session_reminders ON public.focuses;
CREATE TRIGGER trigger_create_session_reminders
  AFTER INSERT OR UPDATE ON public.focuses
  FOR EACH ROW
  EXECUTE FUNCTION public.create_session_reminders();

-- =====================================================
-- GET PENDING REMINDERS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_pending_reminders(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  reminder_type reminder_type,
  scheduled_for TIMESTAMPTZ,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB,
  profile_email TEXT,
  profile_name TEXT,
  profile_locale TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.profile_id,
    sr.reminder_type,
    sr.scheduled_for,
    sr.reference_type,
    sr.reference_id,
    sr.metadata,
    u.email as profile_email,
    p.display_name as profile_name,
    p.language as profile_locale
  FROM public.scheduled_reminders sr
  JOIN public.profiles p ON p.id = sr.profile_id
  JOIN public.users u ON u.id = p.user_id
  WHERE sr.status = 'pending'
  AND sr.scheduled_for <= NOW()
  ORDER BY sr.scheduled_for ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- MARK REMINDERS AS SENT
-- =====================================================

CREATE OR REPLACE FUNCTION public.mark_reminder_sent(
  p_reminder_id UUID,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.scheduled_reminders
  SET 
    status = CASE WHEN p_success THEN 'sent'::reminder_status ELSE 'failed'::reminder_status END,
    sent_at = CASE WHEN p_success THEN NOW() ELSE NULL END,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_reminder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_scheduled_reminders_updated_at ON public.scheduled_reminders;
CREATE TRIGGER update_scheduled_reminders_updated_at
  BEFORE UPDATE ON public.scheduled_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guardian_consents_updated_at ON public.guardian_consents;
CREATE TRIGGER update_guardian_consents_updated_at
  BEFORE UPDATE ON public.guardian_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
