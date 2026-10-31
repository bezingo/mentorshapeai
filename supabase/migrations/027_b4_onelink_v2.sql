-- Migration: B4 OneLink v2 - Page modes, visibility, and sharing
-- Adds page_mode for mentor/mentee profiles, onelink_blocks, and share functionality

-- =====================================================
-- PROFILE PAGE MODE
-- =====================================================

CREATE TYPE page_mode AS ENUM ('mentor', 'mentee', 'both');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS page_mode page_mode DEFAULT 'mentor',
  ADD COLUMN IF NOT EXISTS onelink_share_image_url TEXT,
  ADD COLUMN IF NOT EXISTS onelink_theme JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS goals_public BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS affiliations_public BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.page_mode IS 'Which mode to show on public OneLink: mentor, mentee, or both';
COMMENT ON COLUMN public.profiles.onelink_share_image_url IS 'Pre-generated OG share image URL';
COMMENT ON COLUMN public.profiles.onelink_theme IS 'Custom theme settings for OneLink page';
COMMENT ON COLUMN public.profiles.goals_public IS 'Whether goals are visible on public profile';
COMMENT ON COLUMN public.profiles.affiliations_public IS 'Whether verified affiliations show on profile';

-- =====================================================
-- ONELINK BLOCKS (FOR B9 EDITOR, READ-ONLY RENDER NOW)
-- =====================================================

CREATE TYPE onelink_block_type AS ENUM (
  'bio',
  'goals',
  'experience',
  'education',
  'skills',
  'offers',
  'testimonials',
  'social',
  'custom'
);

CREATE TABLE IF NOT EXISTS public.onelink_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  block_type onelink_block_type NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onelink_blocks_profile ON public.onelink_blocks(profile_id);
CREATE INDEX IF NOT EXISTS idx_onelink_blocks_order ON public.onelink_blocks(profile_id, order_index);

ALTER TABLE public.onelink_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public onelink blocks"
  ON public.onelink_blocks FOR SELECT
  USING (
    is_hidden = FALSE OR
    profile_id = public.get_profile_id()
  );

CREATE POLICY "Users can manage own onelink blocks"
  ON public.onelink_blocks FOR ALL
  USING (profile_id = public.get_profile_id());

CREATE POLICY "Service role manages onelink blocks"
  ON public.onelink_blocks FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.onelink_blocks IS 'Customizable blocks for OneLink profiles (editor in B9)';
COMMENT ON COLUMN public.onelink_blocks.block_type IS 'Type of block: bio, goals, experience, etc.';
COMMENT ON COLUMN public.onelink_blocks.is_featured IS 'Whether to feature/highlight this block';
COMMENT ON COLUMN public.onelink_blocks.payload IS 'Custom content/settings for the block';

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_onelink_blocks_updated_at ON public.onelink_blocks;
CREATE TRIGGER update_onelink_blocks_updated_at
  BEFORE UPDATE ON public.onelink_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ONELINK EVENTS (ANALYTICS FOR B9, STRUCTURE NOW)
-- =====================================================

CREATE TYPE onelink_event_type AS ENUM ('view', 'click', 'share', 'copy_link', 'qr_scan');

CREATE TABLE IF NOT EXISTS public.onelink_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type onelink_event_type NOT NULL,
  visitor_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onelink_events_profile ON public.onelink_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_onelink_events_type ON public.onelink_events(event_type);
CREATE INDEX IF NOT EXISTS idx_onelink_events_created ON public.onelink_events(created_at);

ALTER TABLE public.onelink_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile owners can view own events"
  ON public.onelink_events FOR SELECT
  USING (profile_id = public.get_profile_id());

CREATE POLICY "Anyone can create events"
  ON public.onelink_events FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Service role manages events"
  ON public.onelink_events FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.onelink_events IS 'Analytics events for OneLink profile views and interactions';

-- =====================================================
-- MENTEE GOALS PUBLIC VIEW
-- =====================================================

-- Add a view for public goals on mentee profiles
CREATE OR REPLACE VIEW public.public_goals AS
SELECT 
  g.id,
  g.profile_id,
  g.title,
  g.description,
  g.category,
  g.status,
  g.public_slug,
  g.created_at,
  g.completed_at,
  p.display_name as profile_display_name,
  p.avatar_url as profile_avatar_url,
  p.public_handle
FROM public.goals g
JOIN public.profiles p ON p.id = g.profile_id
WHERE g.status IN ('active', 'completed')
AND p.goals_public = TRUE;

-- =====================================================
-- SHARE LINK TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  short_code TEXT UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_share_links_code ON public.share_links(short_code);
CREATE INDEX IF NOT EXISTS idx_share_links_profile ON public.share_links(profile_id);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view share links"
  ON public.share_links FOR SELECT
  USING (TRUE);

CREATE POLICY "Profile owners manage own share links"
  ON public.share_links FOR ALL
  USING (profile_id = public.get_profile_id());

CREATE POLICY "Service role manages share links"
  ON public.share_links FOR ALL
  USING (auth.role() = 'service_role');

-- Function to generate short code
CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS TEXT AS $$
BEGIN
  RETURN lower(encode(gen_random_bytes(4), 'hex'));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER: GET PROFILE FOR ONELINK
-- =====================================================

-- Function to get full profile data for OneLink rendering
CREATE OR REPLACE FUNCTION public.get_onelink_profile(p_handle TEXT)
RETURNS TABLE (
  profile JSONB,
  verified_affiliations JSONB,
  public_goals JSONB,
  active_offers JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_jsonb(p.*) as profile,
    COALESCE(p.verified_affiliations, '[]'::jsonb) as verified_affiliations,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', g.id,
        'title', g.title,
        'description', g.description,
        'category', g.category,
        'status', g.status,
        'slug', g.public_slug
      ))
      FROM public.goals g 
      WHERE g.profile_id = p.id 
      AND g.status IN ('active', 'completed')
      AND p.goals_public = TRUE),
      '[]'::jsonb
    ) as public_goals,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', mo.id,
        'title', mo.title,
        'description', mo.description,
        'type', mo.type::text,
        'is_free', (mo.price_cents IS NULL OR mo.price_cents = 0),
        'price_cents', mo.price_cents,
        'duration_minutes', mo.duration_minutes
      ))
      FROM public.mentor_offers mo 
      WHERE mo.mentor_profile_id = p.id 
      AND mo.is_active = TRUE),
      '[]'::jsonb
    ) as active_offers
  FROM public.profiles p
  WHERE p.public_handle = p_handle;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
