-- 018_goal_completions.sql
-- Goal completion and mentor badges schema for Phase 3
-- Creates tables for: goal_completions, enhanced mentor_badges

-------------------------
-- GOAL COMPLETIONS TABLE
-------------------------

CREATE TABLE IF NOT EXISTS public.goal_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE UNIQUE,
  collaboration_id UUID REFERENCES public.collaborations(id) ON DELETE SET NULL,
  completed_by UUID NOT NULL REFERENCES public.profiles(id),
  confirmed_by UUID REFERENCES public.profiles(id),
  final_summary TEXT,
  mentee_reflection TEXT,
  mentor_feedback TEXT,
  rating INTEGER,
  linkedin_post_text TEXT,
  badge_awarded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT goal_completions_valid_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

COMMENT ON TABLE public.goal_completions IS 'Records of completed goals with reflections and achievements';
COMMENT ON COLUMN public.goal_completions.goal_id IS 'The goal that was completed';
COMMENT ON COLUMN public.goal_completions.collaboration_id IS 'Optional collaboration through which the goal was achieved';
COMMENT ON COLUMN public.goal_completions.completed_by IS 'Profile ID of the mentee who completed the goal';
COMMENT ON COLUMN public.goal_completions.confirmed_by IS 'Profile ID of the mentor who confirmed completion';
COMMENT ON COLUMN public.goal_completions.final_summary IS 'AI-generated final summary of the goal journey';
COMMENT ON COLUMN public.goal_completions.mentee_reflection IS 'Mentee''s personal reflection on achieving the goal';
COMMENT ON COLUMN public.goal_completions.mentor_feedback IS 'Mentor''s feedback on the mentee''s journey';
COMMENT ON COLUMN public.goal_completions.rating IS 'Mentee''s rating of their mentor (1-5)';
COMMENT ON COLUMN public.goal_completions.linkedin_post_text IS 'AI-generated LinkedIn achievement post';
COMMENT ON COLUMN public.goal_completions.badge_awarded_at IS 'When the mentor badge was awarded';
COMMENT ON COLUMN public.goal_completions.completed_at IS 'When the goal was marked as complete';

-------------------------
-- ENHANCE MENTOR BADGES TABLE
-------------------------

-- Add new columns to existing mentor_badges table for collaboration tracking
ALTER TABLE public.mentor_badges 
  ADD COLUMN IF NOT EXISTS collaboration_id UUID REFERENCES public.collaborations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update column names to match spec (if needed)
-- Note: profile_id column needs to be renamed from mentor_profile_id if different
-- The existing table uses mentor_profile_id, spec uses profile_id
-- We'll keep mentor_profile_id for backward compatibility and add profile_id as alias if needed

COMMENT ON TABLE public.mentor_badges IS 'Badges earned by mentors for successful collaborations';
COMMENT ON COLUMN public.mentor_badges.collaboration_id IS 'The collaboration that earned this badge';
COMMENT ON COLUMN public.mentor_badges.earned_at IS 'When the badge was earned';

-- Add unique constraint for badge type per collaboration
-- Using DO block to handle if constraint already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mentor_badges_profile_type_collaboration_key'
  ) THEN
    ALTER TABLE public.mentor_badges 
      ADD CONSTRAINT mentor_badges_profile_type_collaboration_key 
      UNIQUE(mentor_profile_id, type, collaboration_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-------------------------
-- INDEXES
-------------------------

CREATE INDEX IF NOT EXISTS idx_goal_completions_goal ON public.goal_completions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_completions_collaboration ON public.goal_completions(collaboration_id) WHERE collaboration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goal_completions_completed_by ON public.goal_completions(completed_by);
CREATE INDEX IF NOT EXISTS idx_goal_completions_completed_at ON public.goal_completions(completed_at);

CREATE INDEX IF NOT EXISTS idx_mentor_badges_profile ON public.mentor_badges(mentor_profile_id);
CREATE INDEX IF NOT EXISTS idx_mentor_badges_collaboration ON public.mentor_badges(collaboration_id) WHERE collaboration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_badges_type ON public.mentor_badges(type);
CREATE INDEX IF NOT EXISTS idx_mentor_badges_earned_at ON public.mentor_badges(earned_at);

-------------------------
-- ENABLE RLS
-------------------------

ALTER TABLE public.goal_completions ENABLE ROW LEVEL SECURITY;

-------------------------
-- RLS POLICIES: GOAL_COMPLETIONS
-------------------------

-- Goal owner can view their goal completions
CREATE POLICY "Users can view own goal completions"
  ON public.goal_completions
  FOR SELECT
  USING (
    completed_by = auth.get_profile_id()
    OR EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = goal_completions.collaboration_id
      AND c.mentor_profile_id = auth.get_profile_id()
    )
  );

-- Mentee can create goal completion for their own goals
CREATE POLICY "Mentees can complete own goals"
  ON public.goal_completions
  FOR INSERT
  WITH CHECK (
    completed_by = auth.get_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id
      AND g.profile_id = auth.get_profile_id()
    )
  );

-- Mentee can update their own goal completions (for reflection)
CREATE POLICY "Mentees can update own goal completions"
  ON public.goal_completions
  FOR UPDATE
  USING (
    completed_by = auth.get_profile_id()
  );

-- Mentor can update goal completions in their collaborations (for confirmation)
CREATE POLICY "Mentors can confirm goal completions"
  ON public.goal_completions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = goal_completions.collaboration_id
      AND c.mentor_profile_id = auth.get_profile_id()
    )
  );

-- Public goal completions are viewable (for sharing achievements)
CREATE POLICY "Public goal completions are viewable"
  ON public.goal_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_completions.goal_id
      AND g.public_slug IS NOT NULL
    )
  );

-- Service role can manage goal completions (for AI summary generation)
CREATE POLICY "Service role can manage goal completions"
  ON public.goal_completions
  FOR ALL
  USING (auth.role() = 'service_role');

-------------------------
-- RLS POLICIES: MENTOR_BADGES (ADDITIONAL)
-------------------------

-- Note: Basic mentor_badges policies already exist in 002_rls_policies.sql
-- Adding additional policies for collaboration-based badges

-- Mentors can view badges for their collaborations
CREATE POLICY "Mentors can view collaboration badges"
  ON public.mentor_badges
  FOR SELECT
  USING (
    mentor_profile_id = auth.get_profile_id()
    OR collaboration_id IN (
      SELECT id FROM public.collaborations
      WHERE mentee_profile_id = auth.get_profile_id()
    )
  );

-- Service role can award badges (via API on goal completion)
CREATE POLICY "Service role can manage mentor badges"
  ON public.mentor_badges
  FOR ALL
  USING (auth.role() = 'service_role');

-------------------------
-- UPDATED_AT TRIGGER FOR GOAL_COMPLETIONS
-------------------------

-- Note: The update_updated_at_column function is created in 017_collaborations.sql
-- Adding trigger for goal_completions

DROP TRIGGER IF EXISTS update_goal_completions_updated_at ON public.goal_completions;
-- Goal completions doesn't have updated_at column per spec, so no trigger needed

-------------------------
-- HELPER FUNCTION: AWARD MENTOR BADGE
-------------------------

CREATE OR REPLACE FUNCTION award_mentor_badge(
  p_mentor_profile_id UUID,
  p_badge_type TEXT,
  p_collaboration_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_badge_id UUID;
BEGIN
  INSERT INTO public.mentor_badges (
    mentor_profile_id,
    type,
    label,
    collaboration_id,
    metadata,
    earned_at
  )
  VALUES (
    p_mentor_profile_id,
    p_badge_type,
    CASE p_badge_type
      WHEN 'first_completion' THEN 'First Goal Completed'
      WHEN 'five_completions' THEN '5 Goals Completed'
      WHEN 'ten_completions' THEN '10 Goals Completed'
      WHEN 'highly_rated' THEN 'Highly Rated Mentor'
      WHEN 'consistent_mentor' THEN 'Consistent Mentor'
      ELSE p_badge_type
    END,
    p_collaboration_id,
    p_metadata,
    NOW()
  )
  ON CONFLICT (mentor_profile_id, type, collaboration_id) DO NOTHING
  RETURNING id INTO v_badge_id;
  
  RETURN v_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION award_mentor_badge IS 'Awards a badge to a mentor, handling duplicates gracefully';
