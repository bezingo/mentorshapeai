-- 011_goal_motivation_field.sql
-- Adds optional fields to goals table for enhanced goal planning information

-- Add motivation field: Why the user wants to achieve this goal
alter table public.goals
add column motivation text;

-- Add suggested_approach field: AI-generated suggestions on how to achieve the goal
alter table public.goals
add column suggested_approach text;

-- Add comments for documentation
comment on column public.goals.motivation is 'Why the user wants to achieve this goal (extracted during goal planning conversation)';
comment on column public.goals.suggested_approach is 'AI-generated suggestions on how the user might achieve this goal';


