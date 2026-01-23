-- 014_goal_versions.sql
-- Adds version history tracking for goals to see how they evolved over time

-------------------------
-- GOAL VERSIONS TABLE
-------------------------

CREATE TABLE public.goal_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  changed_by text NOT NULL CHECK (changed_by IN ('user', 'ai_advisor', 'ai_shaper', 'ai_swot', 'ai_smart')),
  change_summary text,
  
  -- Snapshot of goal state at this version
  title text,
  description text,
  refined_goal_statement text,
  success_definition text,
  current_challenges text,
  suggested_mentor_questions text[],
  risks_pitfalls jsonb,
  swot_analysis jsonb,
  smart_framework jsonb,
  mentor_notes text,
  milestones_snapshot jsonb, -- Array of milestone objects at this point in time
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure unique version numbers per goal
  UNIQUE(goal_id, version_number)
);

-- Index for fast lookups by goal
CREATE INDEX idx_goal_versions_goal_id ON public.goal_versions(goal_id, version_number DESC);

-- Index for querying by change source
CREATE INDEX idx_goal_versions_changed_by ON public.goal_versions(changed_by);

-- Comments for documentation
COMMENT ON TABLE public.goal_versions IS 'Stores historical snapshots of goals to track evolution over time';
COMMENT ON COLUMN public.goal_versions.version_number IS 'Sequential version number starting from 1';
COMMENT ON COLUMN public.goal_versions.changed_by IS 'Source of the change: user (manual edit), ai_advisor (chat), ai_shaper (goal shaping), ai_swot, ai_smart';
COMMENT ON COLUMN public.goal_versions.change_summary IS 'Human-readable summary of what changed in this version';
COMMENT ON COLUMN public.goal_versions.milestones_snapshot IS 'JSON array of milestone objects at this version: [{id, title, description, target_date, status}]';

-------------------------
-- RLS POLICIES
-------------------------

ALTER TABLE public.goal_versions ENABLE ROW LEVEL SECURITY;

-- Users can view versions of their own goals
CREATE POLICY "Users can view their own goal versions"
  ON public.goal_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.profiles p ON g.profile_id = p.id
      JOIN public.users u ON p.user_id = u.id
      WHERE g.id = goal_versions.goal_id
      AND u.clerk_user_id = auth.uid()::text
    )
  );

-- Users can insert versions for their own goals
CREATE POLICY "Users can insert versions for their own goals"
  ON public.goal_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.profiles p ON g.profile_id = p.id
      JOIN public.users u ON p.user_id = u.id
      WHERE g.id = goal_versions.goal_id
      AND u.clerk_user_id = auth.uid()::text
    )
  );

-- Users cannot update or delete versions (immutable history)
-- No UPDATE or DELETE policies = versions are append-only

-------------------------
-- HELPER FUNCTION
-------------------------

-- Function to get the next version number for a goal
CREATE OR REPLACE FUNCTION public.get_next_goal_version_number(p_goal_id uuid)
RETURNS int
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM public.goal_versions
  WHERE goal_id = p_goal_id;
$$;

COMMENT ON FUNCTION public.get_next_goal_version_number IS 'Returns the next sequential version number for a goal';
