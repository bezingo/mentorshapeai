-- 017_collaborations.sql
-- Enhanced collaboration and focuses schema for Phase 3
-- Creates/alters tables for: collaborations (enhanced), focuses, focus_agendas, focus_summaries, 
-- action_items, check_ins, progress_scores

-------------------------
-- ENHANCE COLLABORATIONS TABLE
-------------------------

-- Add new columns to existing collaborations table
ALTER TABLE public.collaborations 
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.mentor_offers(id),
  ADD COLUMN IF NOT EXISTS request_message TEXT,
  ADD COLUMN IF NOT EXISTS response_message TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON TABLE public.collaborations IS 'Collaboration between mentor and mentee for a specific goal';
COMMENT ON COLUMN public.collaborations.offer_id IS 'Optional mentor offer this collaboration is based on';
COMMENT ON COLUMN public.collaborations.request_message IS 'Message from mentee when requesting collaboration';
COMMENT ON COLUMN public.collaborations.response_message IS 'Message from mentor when accepting/declining';
COMMENT ON COLUMN public.collaborations.started_at IS 'When the collaboration became active';
COMMENT ON COLUMN public.collaborations.completed_at IS 'When the collaboration was completed';
COMMENT ON COLUMN public.collaborations.cancelled_at IS 'When the collaboration was cancelled';
COMMENT ON COLUMN public.collaborations.cancelled_by IS 'Profile ID of who cancelled the collaboration';
COMMENT ON COLUMN public.collaborations.cancellation_reason IS 'Reason for cancellation';

-- Add constraint to ensure mentor and mentee are different
-- Note: Using DO block to avoid error if constraint already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'different_parties'
  ) THEN
    ALTER TABLE public.collaborations 
      ADD CONSTRAINT different_parties CHECK (mentor_profile_id != mentee_profile_id);
  END IF;
END $$;

-- Add unique constraint for goal-mentor combination
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'collaborations_goal_id_mentor_profile_id_key'
  ) THEN
    ALTER TABLE public.collaborations 
      ADD CONSTRAINT collaborations_goal_id_mentor_profile_id_key UNIQUE(goal_id, mentor_profile_id);
  END IF;
END $$;

-------------------------
-- FOCUSES TABLE
-------------------------

CREATE TABLE IF NOT EXISTS public.focuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaboration_id UUID NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled',
  meeting_url TEXT,
  meeting_id TEXT,
  meeting_provider TEXT DEFAULT 'zoom',
  recording_url TEXT,
  transcript_url TEXT,
  mentor_calendar_event_id TEXT,
  mentee_calendar_event_id TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT focuses_valid_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'))
);

COMMENT ON TABLE public.focuses IS 'Scheduled focus sessions within a collaboration';
COMMENT ON COLUMN public.focuses.scheduled_at IS 'When the focus is scheduled to occur';
COMMENT ON COLUMN public.focuses.duration_minutes IS 'Duration of the focus in minutes (default 60)';
COMMENT ON COLUMN public.focuses.status IS 'Current status: scheduled, in_progress, completed, cancelled, no_show';
COMMENT ON COLUMN public.focuses.meeting_url IS 'URL to join the video meeting';
COMMENT ON COLUMN public.focuses.meeting_id IS 'External meeting ID (e.g., Zoom meeting ID)';
COMMENT ON COLUMN public.focuses.meeting_provider IS 'Video meeting provider (zoom, etc.)';
COMMENT ON COLUMN public.focuses.recording_url IS 'URL to the meeting recording';
COMMENT ON COLUMN public.focuses.transcript_url IS 'URL to the meeting transcript';
COMMENT ON COLUMN public.focuses.mentor_calendar_event_id IS 'Calendar event ID in mentor''s calendar';
COMMENT ON COLUMN public.focuses.mentee_calendar_event_id IS 'Calendar event ID in mentee''s calendar';

-------------------------
-- FOCUS AGENDAS TABLE
-------------------------

CREATE TABLE IF NOT EXISTS public.focus_agendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  focus_id UUID NOT NULL REFERENCES public.focuses(id) ON DELETE CASCADE UNIQUE,
  topics JSONB NOT NULL DEFAULT '[]',
  questions JSONB NOT NULL DEFAULT '[]',
  previous_action_items JSONB NOT NULL DEFAULT '[]',
  preparation_tips TEXT[],
  mentee_notes TEXT,
  mentor_notes TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.focus_agendas IS 'AI-generated agendas for focus sessions';
COMMENT ON COLUMN public.focus_agendas.topics IS 'JSONB array of discussion topics with title, description, priority, estimated_minutes';
COMMENT ON COLUMN public.focus_agendas.questions IS 'JSONB array of suggested questions with question and context';
COMMENT ON COLUMN public.focus_agendas.previous_action_items IS 'JSONB array of outstanding action items from previous focuses';
COMMENT ON COLUMN public.focus_agendas.preparation_tips IS 'Array of preparation tips for the mentee';
COMMENT ON COLUMN public.focus_agendas.mentee_notes IS 'Notes added by mentee before the focus';
COMMENT ON COLUMN public.focus_agendas.mentor_notes IS 'Notes added by mentor before the focus';
COMMENT ON COLUMN public.focus_agendas.generated_at IS 'When the AI generated this agenda';

-------------------------
-- FOCUS SUMMARIES TABLE
-------------------------

CREATE TABLE IF NOT EXISTS public.focus_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  focus_id UUID NOT NULL REFERENCES public.focuses(id) ON DELETE CASCADE UNIQUE,
  summary TEXT NOT NULL,
  key_decisions JSONB NOT NULL DEFAULT '[]',
  mentee_action_items JSONB NOT NULL DEFAULT '[]',
  mentor_action_items JSONB NOT NULL DEFAULT '[]',
  milestone_updates JSONB NOT NULL DEFAULT '[]',
  mood_rating INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT focus_summaries_valid_mood CHECK (mood_rating IS NULL OR (mood_rating >= 1 AND mood_rating <= 5))
);

COMMENT ON TABLE public.focus_summaries IS 'AI-generated summaries of completed focus sessions';
COMMENT ON COLUMN public.focus_summaries.summary IS 'Text summary of the focus discussion';
COMMENT ON COLUMN public.focus_summaries.key_decisions IS 'JSONB array of decisions made during the focus';
COMMENT ON COLUMN public.focus_summaries.mentee_action_items IS 'JSONB array of action items for the mentee';
COMMENT ON COLUMN public.focus_summaries.mentor_action_items IS 'JSONB array of action items for the mentor';
COMMENT ON COLUMN public.focus_summaries.milestone_updates IS 'JSONB array of suggested milestone status updates';
COMMENT ON COLUMN public.focus_summaries.mood_rating IS 'Mentee mood rating 1-5 after the focus';
COMMENT ON COLUMN public.focus_summaries.generated_at IS 'When the AI generated this summary';

-------------------------
-- ACTION ITEMS TABLE
-------------------------

CREATE TABLE IF NOT EXISTS public.action_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  focus_id UUID REFERENCES public.focuses(id) ON DELETE SET NULL,
  collaboration_id UUID NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  assignee_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT action_items_valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

COMMENT ON TABLE public.action_items IS 'Action items extracted from focuses or created manually';
COMMENT ON COLUMN public.action_items.focus_id IS 'Optional reference to the focus where this item was created';
COMMENT ON COLUMN public.action_items.collaboration_id IS 'The collaboration this action item belongs to';
COMMENT ON COLUMN public.action_items.assignee_profile_id IS 'Profile ID of the person assigned to this item';
COMMENT ON COLUMN public.action_items.title IS 'Short title/description of the action item';
COMMENT ON COLUMN public.action_items.description IS 'Detailed description of what needs to be done';
COMMENT ON COLUMN public.action_items.due_date IS 'When this action item is due';
COMMENT ON COLUMN public.action_items.status IS 'Current status: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN public.action_items.completed_at IS 'When the action item was marked complete';

-------------------------
-- CHECK-INS TABLE
-------------------------

CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaboration_id UUID NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  week_start DATE NOT NULL,
  mood_rating INTEGER NOT NULL,
  progress_notes TEXT,
  blockers TEXT,
  wins TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_ins_valid_mood CHECK (mood_rating >= 1 AND mood_rating <= 5),
  CONSTRAINT check_ins_unique_week UNIQUE(collaboration_id, profile_id, week_start)
);

COMMENT ON TABLE public.check_ins IS 'Weekly check-ins from collaboration participants';
COMMENT ON COLUMN public.check_ins.profile_id IS 'Profile ID of the person submitting the check-in';
COMMENT ON COLUMN public.check_ins.week_start IS 'Start date of the week this check-in covers';
COMMENT ON COLUMN public.check_ins.mood_rating IS 'Mood/energy rating 1-5';
COMMENT ON COLUMN public.check_ins.progress_notes IS 'Notes on progress made during the week';
COMMENT ON COLUMN public.check_ins.blockers IS 'Current blockers or challenges';
COMMENT ON COLUMN public.check_ins.wins IS 'Wins or accomplishments from the week';

-------------------------
-- PROGRESS SCORES TABLE
-------------------------

CREATE TABLE IF NOT EXISTS public.progress_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaboration_id UUID NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  trend TEXT NOT NULL DEFAULT 'stable',
  analysis TEXT NOT NULL,
  risk_areas JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  predicted_completion_date DATE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT progress_scores_valid_score CHECK (score >= 0 AND score <= 100),
  CONSTRAINT progress_scores_valid_trend CHECK (trend IN ('improving', 'stable', 'declining'))
);

COMMENT ON TABLE public.progress_scores IS 'AI-generated progress analysis scores for collaborations';
COMMENT ON COLUMN public.progress_scores.score IS 'Progress score 0-100';
COMMENT ON COLUMN public.progress_scores.trend IS 'Trend direction: improving, stable, declining';
COMMENT ON COLUMN public.progress_scores.analysis IS 'Text analysis of the current progress';
COMMENT ON COLUMN public.progress_scores.risk_areas IS 'JSONB array of identified risk areas';
COMMENT ON COLUMN public.progress_scores.recommendations IS 'JSONB array of recommendations';
COMMENT ON COLUMN public.progress_scores.predicted_completion_date IS 'AI-predicted goal completion date';
COMMENT ON COLUMN public.progress_scores.generated_at IS 'When this analysis was generated';

-------------------------
-- INDEXES
-------------------------

CREATE INDEX IF NOT EXISTS idx_collaborations_mentor_status ON public.collaborations(mentor_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_collaborations_mentee_status ON public.collaborations(mentee_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_collaborations_offer ON public.collaborations(offer_id) WHERE offer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_focuses_collaboration ON public.focuses(collaboration_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_focuses_scheduled ON public.focuses(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_focuses_status ON public.focuses(status);

CREATE INDEX IF NOT EXISTS idx_focus_agendas_focus ON public.focus_agendas(focus_id);
CREATE INDEX IF NOT EXISTS idx_focus_summaries_focus ON public.focus_summaries(focus_id);

CREATE INDEX IF NOT EXISTS idx_action_items_assignee ON public.action_items(assignee_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_action_items_due ON public.action_items(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_action_items_collaboration ON public.action_items(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_action_items_focus ON public.action_items(focus_id) WHERE focus_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_check_ins_collaboration ON public.check_ins(collaboration_id, week_start);
CREATE INDEX IF NOT EXISTS idx_check_ins_profile ON public.check_ins(profile_id);

CREATE INDEX IF NOT EXISTS idx_progress_scores_collaboration ON public.progress_scores(collaboration_id, generated_at);

-------------------------
-- ENABLE RLS
-------------------------

ALTER TABLE public.focuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_scores ENABLE ROW LEVEL SECURITY;

-------------------------
-- RLS POLICIES: FOCUSES
-------------------------

-- Users can view focuses in their collaborations
CREATE POLICY "Users can view focuses in own collaborations"
  ON public.focuses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = focuses.collaboration_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Mentees can book focuses in active collaborations
CREATE POLICY "Mentees can book focuses"
  ON public.focuses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = collaboration_id
      AND c.mentee_profile_id = auth.get_profile_id()
      AND c.status = 'active'
    )
  );

-- Users can update focuses in their collaborations
CREATE POLICY "Users can update focuses in own collaborations"
  ON public.focuses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = focuses.collaboration_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Service role can manage focuses (for calendar/webhook integrations)
CREATE POLICY "Service role can manage focuses"
  ON public.focuses
  FOR ALL
  USING (auth.role() = 'service_role');

-------------------------
-- RLS POLICIES: FOCUS_AGENDAS
-------------------------

-- Users can view agendas for focuses in their collaborations
CREATE POLICY "Users can view focus agendas in own collaborations"
  ON public.focus_agendas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      WHERE f.id = focus_agendas.focus_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Users can insert agendas for focuses in their collaborations
CREATE POLICY "Users can create focus agendas in own collaborations"
  ON public.focus_agendas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      WHERE f.id = focus_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Users can update agendas for focuses in their collaborations
CREATE POLICY "Users can update focus agendas in own collaborations"
  ON public.focus_agendas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      WHERE f.id = focus_agendas.focus_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Service role can manage agendas (for AI generation)
CREATE POLICY "Service role can manage focus agendas"
  ON public.focus_agendas
  FOR ALL
  USING (auth.role() = 'service_role');

-------------------------
-- RLS POLICIES: FOCUS_SUMMARIES
-------------------------

-- Users can view summaries for focuses in their collaborations
CREATE POLICY "Users can view focus summaries in own collaborations"
  ON public.focus_summaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      WHERE f.id = focus_summaries.focus_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Users can insert summaries for focuses in their collaborations
CREATE POLICY "Users can create focus summaries in own collaborations"
  ON public.focus_summaries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      WHERE f.id = focus_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Users can update summaries for focuses in their collaborations
CREATE POLICY "Users can update focus summaries in own collaborations"
  ON public.focus_summaries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.focuses f
      JOIN public.collaborations c ON c.id = f.collaboration_id
      WHERE f.id = focus_summaries.focus_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Service role can manage summaries (for AI generation)
CREATE POLICY "Service role can manage focus summaries"
  ON public.focus_summaries
  FOR ALL
  USING (auth.role() = 'service_role');

-------------------------
-- RLS POLICIES: ACTION_ITEMS
-------------------------

-- Users can view action items in their collaborations
CREATE POLICY "Users can view action items in own collaborations"
  ON public.action_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = action_items.collaboration_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Users can create action items in their collaborations
CREATE POLICY "Users can create action items in own collaborations"
  ON public.action_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = collaboration_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Users can update action items in their collaborations
CREATE POLICY "Users can update action items in own collaborations"
  ON public.action_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = action_items.collaboration_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Users can delete action items in their collaborations
CREATE POLICY "Users can delete action items in own collaborations"
  ON public.action_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = action_items.collaboration_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Service role can manage action items (for AI extraction)
CREATE POLICY "Service role can manage action items"
  ON public.action_items
  FOR ALL
  USING (auth.role() = 'service_role');

-------------------------
-- RLS POLICIES: CHECK_INS
-------------------------

-- Users can view check-ins in their collaborations
CREATE POLICY "Users can view check-ins in own collaborations"
  ON public.check_ins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = check_ins.collaboration_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Users can create their own check-ins in their collaborations
CREATE POLICY "Users can create own check-ins"
  ON public.check_ins
  FOR INSERT
  WITH CHECK (
    profile_id = auth.get_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = collaboration_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Users can update their own check-ins
CREATE POLICY "Users can update own check-ins"
  ON public.check_ins
  FOR UPDATE
  USING (
    profile_id = auth.get_profile_id()
  );

-------------------------
-- RLS POLICIES: PROGRESS_SCORES
-------------------------

-- Users can view progress scores in their collaborations
CREATE POLICY "Users can view progress scores in own collaborations"
  ON public.progress_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = progress_scores.collaboration_id
      AND (c.mentor_profile_id = auth.get_profile_id() OR c.mentee_profile_id = auth.get_profile_id())
    )
  );

-- Service role can manage progress scores (for AI analysis)
CREATE POLICY "Service role can manage progress scores"
  ON public.progress_scores
  FOR ALL
  USING (auth.role() = 'service_role');

-------------------------
-- UPDATED_AT TRIGGERS
-------------------------

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_collaborations_updated_at ON public.collaborations;
CREATE TRIGGER update_collaborations_updated_at
  BEFORE UPDATE ON public.collaborations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_focuses_updated_at ON public.focuses;
CREATE TRIGGER update_focuses_updated_at
  BEFORE UPDATE ON public.focuses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_focus_agendas_updated_at ON public.focus_agendas;
CREATE TRIGGER update_focus_agendas_updated_at
  BEFORE UPDATE ON public.focus_agendas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_focus_summaries_updated_at ON public.focus_summaries;
CREATE TRIGGER update_focus_summaries_updated_at
  BEFORE UPDATE ON public.focus_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_action_items_updated_at ON public.action_items;
CREATE TRIGGER update_action_items_updated_at
  BEFORE UPDATE ON public.action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_check_ins_updated_at ON public.check_ins;
CREATE TRIGGER update_check_ins_updated_at
  BEFORE UPDATE ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
