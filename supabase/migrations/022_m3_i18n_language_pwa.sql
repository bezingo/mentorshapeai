-- Migration: M3 i18n Language + PWA Support
-- Adds language preference to profiles for EN/AR support

-- Add language column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar'));

-- Create index for language-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_language ON public.profiles(language);

-- Comment
COMMENT ON COLUMN public.profiles.language IS 'Preferred language: en (English) or ar (Arabic)';
