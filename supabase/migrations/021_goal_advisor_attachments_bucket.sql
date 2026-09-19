-- Goal Advisor file uploads (see app/api/ai/goal-advisor/upload/route.ts)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'goal-advisor-attachments',
  'goal-advisor-attachments',
  true,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Authenticated users may upload to folders for conversations they own
CREATE POLICY "Mentees can upload goal advisor attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'goal-advisor-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.goal_conversations c
    INNER JOIN public.profiles p ON p.id = c.profile_id
    INNER JOIN public.users u ON u.id = p.user_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND u.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

CREATE POLICY "Mentees can read goal advisor attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'goal-advisor-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.goal_conversations c
    INNER JOIN public.profiles p ON p.id = c.profile_id
    INNER JOIN public.users u ON u.id = p.user_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND u.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

CREATE POLICY "Public read goal advisor attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'goal-advisor-attachments');
