-- 016b_auth_helper_function.sql
-- Helper function to get the current user's profile ID from JWT claims
-- This is used by RLS policies across multiple tables

-- Create the auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create helper function to get profile_id from JWT claims
CREATE OR REPLACE FUNCTION auth.get_profile_id()
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
  v_clerk_user_id TEXT;
BEGIN
  -- Get clerk_user_id from JWT claims
  v_clerk_user_id := current_setting('request.jwt.claims', true)::json->>'clerk_user_id';
  
  -- If no clerk_user_id, return NULL
  IF v_clerk_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get profile_id from the profiles table via users table
  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  JOIN public.users u ON p.user_id = u.id
  WHERE u.clerk_user_id = v_clerk_user_id
  LIMIT 1;
  
  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION auth.get_profile_id() IS 'Returns the profile_id of the currently authenticated user based on JWT claims';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth.get_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.get_profile_id() TO anon;
