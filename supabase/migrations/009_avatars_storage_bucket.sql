-- 009_avatars_storage_bucket.sql
-- Creates the avatars storage bucket with RLS policies for avatar uploads

-- Create the avatars storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,  -- Public read access for avatar display
  5242880,  -- 5MB limit
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Enable RLS on storage.objects (it should already be enabled)
-- alter table storage.objects enable row level security;

-- Policy: Authenticated users can upload avatars to their own folder
-- Path pattern: {profile_id}/avatar.*
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (
    select p.id::text
    from public.profiles p
    inner join public.users u on u.id = p.user_id
    where u.clerk_user_id = auth.jwt() ->> 'sub'
    limit 1
  )
);

-- Policy: Authenticated users can update their own avatar
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (
    select p.id::text
    from public.profiles p
    inner join public.users u on u.id = p.user_id
    where u.clerk_user_id = auth.jwt() ->> 'sub'
    limit 1
  )
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (
    select p.id::text
    from public.profiles p
    inner join public.users u on u.id = p.user_id
    where u.clerk_user_id = auth.jwt() ->> 'sub'
    limit 1
  )
);

-- Policy: Authenticated users can delete their own avatar
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (
    select p.id::text
    from public.profiles p
    inner join public.users u on u.id = p.user_id
    where u.clerk_user_id = auth.jwt() ->> 'sub'
    limit 1
  )
);

-- Policy: Public read access for all avatars (bucket is public)
create policy "Anyone can view avatars"
on storage.objects for select
to public
using (bucket_id = 'avatars');
