-- 015_mentor_onboarding.sql
-- Mentor onboarding and calendar integration schema
-- Creates tables for: onboarding progress, calendar connections, availability patterns, busy blocks

-------------------------
-- MENTOR ONBOARDING PROGRESS
-------------------------

CREATE TABLE public.mentor_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  current_step INTEGER NOT NULL DEFAULT 1,
  completed_steps INTEGER[] DEFAULT '{}',
  form_data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.mentor_onboarding_progress IS 'Tracks mentor onboarding wizard progress, allowing users to resume later';
COMMENT ON COLUMN public.mentor_onboarding_progress.current_step IS 'Current step in the 6-step wizard (1-6)';
COMMENT ON COLUMN public.mentor_onboarding_progress.completed_steps IS 'Array of completed step numbers';
COMMENT ON COLUMN public.mentor_onboarding_progress.form_data IS 'JSONB storage for form data across all steps';

-------------------------
-- CALENDAR CONNECTIONS
-------------------------

CREATE TABLE public.calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT,
  webhook_channel_id TEXT,
  webhook_expiration TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_provider CHECK (provider IN ('google', 'microsoft'))
);

COMMENT ON TABLE public.calendar_connections IS 'Stores OAuth tokens and sync metadata for calendar integrations';
COMMENT ON COLUMN public.calendar_connections.provider IS 'Calendar provider: google or microsoft (future)';
COMMENT ON COLUMN public.calendar_connections.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN public.calendar_connections.refresh_token IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN public.calendar_connections.calendar_id IS 'Primary calendar ID from the provider';
COMMENT ON COLUMN public.calendar_connections.webhook_channel_id IS 'Google Calendar push notification channel ID';
COMMENT ON COLUMN public.calendar_connections.webhook_expiration IS 'When the webhook channel expires (needs renewal)';

-------------------------
-- MENTOR AVAILABILITY
-------------------------

CREATE TABLE public.mentor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

COMMENT ON TABLE public.mentor_availability IS 'Weekly recurring availability patterns for mentors';
COMMENT ON COLUMN public.mentor_availability.day_of_week IS 'Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN public.mentor_availability.start_time IS 'Start time of availability slot';
COMMENT ON COLUMN public.mentor_availability.end_time IS 'End time of availability slot';
COMMENT ON COLUMN public.mentor_availability.timezone IS 'IANA timezone for this availability slot';

-------------------------
-- CALENDAR BUSY BLOCKS
-------------------------

CREATE TABLE public.calendar_busy_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  summary TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, calendar_event_id)
);

COMMENT ON TABLE public.calendar_busy_blocks IS 'Cached busy blocks synced from Google Calendar';
COMMENT ON COLUMN public.calendar_busy_blocks.calendar_event_id IS 'Google Calendar event ID for deduplication';
COMMENT ON COLUMN public.calendar_busy_blocks.start_time IS 'Start time of busy block in UTC';
COMMENT ON COLUMN public.calendar_busy_blocks.end_time IS 'End time of busy block in UTC';
COMMENT ON COLUMN public.calendar_busy_blocks.summary IS 'Event title for debugging (not displayed publicly)';

-------------------------
-- INDEXES
-------------------------

CREATE INDEX idx_mentor_onboarding_profile ON public.mentor_onboarding_progress(profile_id);
CREATE INDEX idx_calendar_connections_profile ON public.calendar_connections(profile_id);
CREATE INDEX idx_mentor_availability_profile_day ON public.mentor_availability(profile_id, day_of_week);
CREATE INDEX idx_mentor_availability_active ON public.mentor_availability(profile_id) WHERE is_active = TRUE;
CREATE INDEX idx_calendar_busy_blocks_profile_time ON public.calendar_busy_blocks(profile_id, start_time, end_time);
CREATE INDEX idx_calendar_busy_blocks_synced ON public.calendar_busy_blocks(profile_id, synced_at);

-------------------------
-- ENABLE RLS
-------------------------

ALTER TABLE public.mentor_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_busy_blocks ENABLE ROW LEVEL SECURITY;

-------------------------
-- RLS POLICIES: MENTOR_ONBOARDING_PROGRESS
-------------------------

CREATE POLICY "Users can view own onboarding progress"
  ON public.mentor_onboarding_progress
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

CREATE POLICY "Users can insert own onboarding progress"
  ON public.mentor_onboarding_progress
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

CREATE POLICY "Users can update own onboarding progress"
  ON public.mentor_onboarding_progress
  FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

-------------------------
-- RLS POLICIES: CALENDAR_CONNECTIONS
-------------------------

CREATE POLICY "Users can view own calendar connection"
  ON public.calendar_connections
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

CREATE POLICY "Users can insert own calendar connection"
  ON public.calendar_connections
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

CREATE POLICY "Users can update own calendar connection"
  ON public.calendar_connections
  FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

CREATE POLICY "Users can delete own calendar connection"
  ON public.calendar_connections
  FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

-------------------------
-- RLS POLICIES: MENTOR_AVAILABILITY
-------------------------

CREATE POLICY "Users can view own availability"
  ON public.mentor_availability
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

CREATE POLICY "Users can insert own availability"
  ON public.mentor_availability
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

CREATE POLICY "Users can update own availability"
  ON public.mentor_availability
  FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

CREATE POLICY "Users can delete own availability"
  ON public.mentor_availability
  FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

-- Public mentor availability is viewable (for booking pages)
CREATE POLICY "Public mentor availability is viewable"
  ON public.mentor_availability
  FOR SELECT
  USING (
    is_active = TRUE AND
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE is_mentor = TRUE AND public_handle IS NOT NULL
    )
  );

-------------------------
-- RLS POLICIES: CALENDAR_BUSY_BLOCKS
-------------------------

CREATE POLICY "Users can view own busy blocks"
  ON public.calendar_busy_blocks
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

CREATE POLICY "Users can insert own busy blocks"
  ON public.calendar_busy_blocks
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

CREATE POLICY "Users can update own busy blocks"
  ON public.calendar_busy_blocks
  FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

CREATE POLICY "Users can delete own busy blocks"
  ON public.calendar_busy_blocks
  FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = (
        SELECT id FROM public.users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'clerk_user_id'
      )
    )
  );

-- Service role can manage busy blocks (for calendar sync)
CREATE POLICY "Service role can manage busy blocks"
  ON public.calendar_busy_blocks
  FOR ALL
  USING (auth.role() = 'service_role');

-- Service role can manage calendar connections (for OAuth flow)
CREATE POLICY "Service role can manage calendar connections"
  ON public.calendar_connections
  FOR ALL
  USING (auth.role() = 'service_role');
