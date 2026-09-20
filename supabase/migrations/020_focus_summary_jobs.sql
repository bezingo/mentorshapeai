-- 020_focus_summary_jobs.sql
-- Background jobs for idempotent AI focus summary generation after Zoom recordings

CREATE TABLE IF NOT EXISTS public.focus_summary_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  focus_id UUID NOT NULL REFERENCES public.focuses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  trigger_event TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 8,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT focus_summary_jobs_focus_id_unique UNIQUE (focus_id)
);

COMMENT ON TABLE public.focus_summary_jobs IS 'Queue for auto-generating focus summaries from Zoom transcripts';
COMMENT ON COLUMN public.focus_summary_jobs.trigger_event IS 'Webhook or source that enqueued the job (e.g. recording.completed)';

CREATE INDEX IF NOT EXISTS idx_focus_summary_jobs_status_scheduled
  ON public.focus_summary_jobs (status, scheduled_at)
  WHERE status = 'pending';

ALTER TABLE public.focus_summary_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage focus summary jobs"
  ON public.focus_summary_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_focus_summary_jobs_updated_at ON public.focus_summary_jobs;
CREATE TRIGGER update_focus_summary_jobs_updated_at
  BEFORE UPDATE ON public.focus_summary_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
