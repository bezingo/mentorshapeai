-- 019_zoom_integration.sql
-- Zoom OAuth integration for video meetings
-- Stores encrypted Zoom access and refresh tokens for mentors

-------------------------
-- ZOOM CONNECTIONS TABLE
-------------------------

CREATE TABLE IF NOT EXISTS public.zoom_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  zoom_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.zoom_connections IS 'Zoom OAuth connections for mentors to auto-create meetings';
COMMENT ON COLUMN public.zoom_connections.profile_id IS 'The mentor profile this connection belongs to';
COMMENT ON COLUMN public.zoom_connections.zoom_user_id IS 'The Zoom user ID from the OAuth response';
COMMENT ON COLUMN public.zoom_connections.access_token IS 'Encrypted Zoom access token';
COMMENT ON COLUMN public.zoom_connections.refresh_token IS 'Encrypted Zoom refresh token';
COMMENT ON COLUMN public.zoom_connections.token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN public.zoom_connections.scopes IS 'OAuth scopes granted';
COMMENT ON COLUMN public.zoom_connections.connected_at IS 'When the Zoom account was connected';
COMMENT ON COLUMN public.zoom_connections.last_used_at IS 'When the connection was last used to create a meeting';

-------------------------
-- INDEXES
-------------------------

CREATE INDEX IF NOT EXISTS idx_zoom_connections_profile ON public.zoom_connections(profile_id);
CREATE INDEX IF NOT EXISTS idx_zoom_connections_zoom_user ON public.zoom_connections(zoom_user_id);

-------------------------
-- ENABLE RLS
-------------------------

ALTER TABLE public.zoom_connections ENABLE ROW LEVEL SECURITY;

-------------------------
-- RLS POLICIES
-------------------------

-- Users can view their own Zoom connection
CREATE POLICY "Users can view own zoom connection"
  ON public.zoom_connections
  FOR SELECT
  USING (profile_id = auth.get_profile_id());

-- Users can insert their own Zoom connection
CREATE POLICY "Users can insert own zoom connection"
  ON public.zoom_connections
  FOR INSERT
  WITH CHECK (profile_id = auth.get_profile_id());

-- Users can update their own Zoom connection
CREATE POLICY "Users can update own zoom connection"
  ON public.zoom_connections
  FOR UPDATE
  USING (profile_id = auth.get_profile_id());

-- Users can delete their own Zoom connection
CREATE POLICY "Users can delete own zoom connection"
  ON public.zoom_connections
  FOR DELETE
  USING (profile_id = auth.get_profile_id());

-- Service role can manage all Zoom connections
CREATE POLICY "Service role can manage zoom connections"
  ON public.zoom_connections
  FOR ALL
  USING (auth.role() = 'service_role');

-------------------------
-- UPDATED_AT TRIGGER
-------------------------

DROP TRIGGER IF EXISTS update_zoom_connections_updated_at ON public.zoom_connections;
CREATE TRIGGER update_zoom_connections_updated_at
  BEFORE UPDATE ON public.zoom_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
