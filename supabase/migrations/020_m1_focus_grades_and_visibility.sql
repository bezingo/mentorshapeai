-- 020_m1_focus_grades_and_visibility.sql
-- M1: Focus grades (both mentor+mentee), goal visibility, mentor invite-only
-- This closes the Focus feedback loop for school-pilot

-------------------------
-- FOCUS GRADES TABLE
-------------------------

-- Stores grades from both mentor and mentee after a Focus
-- Each party rates usefulness (1-5) and honesty (1-5)
-- Both grades are independent - one party can grade without the other
CREATE TABLE IF NOT EXISTS public.focus_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  focus_id UUID NOT NULL REFERENCES public.focuses(id) ON DELETE CASCADE,
  grader_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  grader_role TEXT NOT NULL,
  usefulness_rating INTEGER NOT NULL,
  honesty_rating INTEGER NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT focus_grades_valid_role CHECK (grader_role IN ('mentor', 'mentee')),
  CONSTRAINT focus_grades_valid_usefulness CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
  CONSTRAINT focus_grades_valid_honesty CHECK (honesty_rating >= 1 AND honesty_rating <= 5),
  CONSTRAINT focus_grades_unique_per_role UNIQUE(focus_id, grader_role)
);

COMMENT ON TABLE public.focus_grades IS 'Grades submitted by mentor and mentee after a Focus session';
COMMENT ON COLUMN public.focus_grades.grader_role IS 'Whether the grader is the mentor or mentee';
COMMENT ON COLUMN public.focus_grades.usefulness_rating IS 'How useful the session was (1-5)';
COMMENT ON COLUMN public.focus_grades.honesty_rating IS 'How honest/open the communication was (1-5)';
COMMENT ON COLUMN public.focus_grades.feedback IS 'Optional text feedback';

-- Index for quick lookup by focus
CREATE INDEX IF NOT EXISTS idx_focus_grades_focus ON public.focus_grades(focus_id);
CREATE INDEX IF NOT EXISTS idx_focus_grades_grader ON public.focus_grades(grader_profile_id);

-------------------------
-- GOAL VISIBILITY
-------------------------

-- Add is_public flag to goals (default false for school-pilot privacy)
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.goals.is_public IS 'Whether the goal is publicly visible via /g/slug (default false for privacy)';

-------------------------
-- MENTOR INVITE-ONLY FLAG
-------------------------

-- Add invite_only flag to profiles for mentor pages
-- When true, the mentor page does not show "Request Mentorship" to cold visitors
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invite_only BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.invite_only IS 'If true, mentor page does not accept cold public requests';

-------------------------
-- RLS FOR FOCUS GRADES
-------------------------

ALTER TABLE public.focus_grades ENABLE ROW LEVEL SECURITY;

-- Users can view grades for focuses in their collaborations
CREATE POLICY "Users can view focus grades in own collaborations"
  ON public.focus_grades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      WHERE f.id = focus_grades.focus_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Users can create their own grades for focuses in their collaborations
CREATE POLICY "Users can create own focus grades"
  ON public.focus_grades
  FOR INSERT
  WITH CHECK (
    grader_profile_id = auth.get_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      WHERE f.id = focus_id
      AND (
        (grader_role = 'mentor' AND c.mentor_profile_id = auth.get_profile_id())
        OR (grader_role = 'mentee' AND c.mentee_profile_id = auth.get_profile_id())
      )
    )
  );

-- Users can update their own grades
CREATE POLICY "Users can update own focus grades"
  ON public.focus_grades
  FOR UPDATE
  USING (grader_profile_id = auth.get_profile_id());

-- Service role can manage all grades
CREATE POLICY "Service role can manage focus grades"
  ON public.focus_grades
  FOR ALL
  USING (auth.role() = 'service_role');

-------------------------
-- UPDATED_AT TRIGGER
-------------------------

DROP TRIGGER IF EXISTS update_focus_grades_updated_at ON public.focus_grades;
CREATE TRIGGER update_focus_grades_updated_at
  BEFORE UPDATE ON public.focus_grades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
