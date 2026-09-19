-- Add collaboration statuses used by the application (accept/decline flows)
ALTER TYPE public.collaboration_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE public.collaboration_status ADD VALUE IF NOT EXISTS 'declined';
