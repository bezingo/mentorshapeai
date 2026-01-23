-- 012_goal_analysis_fields.sql
-- Adds fields to goals table for SWOT analysis, SMART framework, and mentor notes

-- Add SWOT analysis field: Structured analysis stored as JSONB
-- Format: {"strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[]}
alter table public.goals
add column swot_analysis jsonb;

-- Add SMART framework field: Structured framework stored as JSONB
-- Format: {"specific": string, "measurable": string, "achievable": string, "relevant": string, "time_bound": string}
alter table public.goals
add column smart_framework jsonb;

-- Add mentor notes field: AI-generated notes for mentors, editable by mentee
alter table public.goals
add column mentor_notes text;

-- Add timestamps for when each analysis was generated
alter table public.goals
add column swot_generated_at timestamptz,
add column smart_generated_at timestamptz,
add column mentor_notes_generated_at timestamptz;

-- Add comments for documentation
comment on column public.goals.swot_analysis is 'SWOT analysis structure: {"strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[]}';
comment on column public.goals.smart_framework is 'SMART framework breakdown: {"specific": string, "measurable": string, "achievable": string, "relevant": string, "time_bound": string}';
comment on column public.goals.mentor_notes is 'AI-generated comprehensive notes for mentors, editable by mentee';
comment on column public.goals.swot_generated_at is 'Timestamp when SWOT analysis was last generated';
comment on column public.goals.smart_generated_at is 'Timestamp when SMART framework was last generated';
comment on column public.goals.mentor_notes_generated_at is 'Timestamp when mentor notes were last generated';


