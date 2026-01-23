-- 010_goal_shaper_fields.sql
-- Adds fields to goals table for AI Goal Shaper Agent generated content

-- Add refined_goal_statement: AI-refined version of user's goal (max 500 chars)
alter table public.goals
add column refined_goal_statement text
constraint refined_goal_statement_length check (char_length(refined_goal_statement) <= 500);

-- Add suggested_mentor_questions: Array of questions for mentor (max 20 items)
alter table public.goals
add column suggested_mentor_questions text[] default '{}'
constraint suggested_mentor_questions_length check (array_length(suggested_mentor_questions, 1) <= 20);

-- Add risks_pitfalls: Structured risk-mitigation pairs stored as JSONB
-- Format: [{"risk": string, "mitigation": string}, ...]
alter table public.goals
add column risks_pitfalls jsonb;

-- Add ai_shaped_at: Timestamp when AI shaping was completed
alter table public.goals
add column ai_shaped_at timestamptz;

-- Add comment for documentation
comment on column public.goals.refined_goal_statement is 'AI-refined version of the user''s goal, cleaned and clarified';
comment on column public.goals.suggested_mentor_questions is 'Array of suggested questions the mentee should ask their mentor (max 20)';
comment on column public.goals.risks_pitfalls is 'Structured risk-mitigation pairs: [{"risk": string, "mitigation": string}]';
comment on column public.goals.ai_shaped_at is 'Timestamp when the AI Goal Shaper Agent completed shaping this goal';


