-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."users" (
  "id" UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id),
  "email" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "is_admin" BOOLEAN DEFAULT false,
  "lifetime_message_count" INTEGER DEFAULT 0
);

-- Add first_name and last_name columns to users table
ALTER TABLE IF EXISTS "public"."users" 
ADD COLUMN IF NOT EXISTS "first_name" TEXT,
ADD COLUMN IF NOT EXISTS "last_name" TEXT;

-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can read own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create or replace function to update user profile
CREATE OR REPLACE FUNCTION "public"."update_user_profile"(
  user_id UUID,
  new_first_name TEXT DEFAULT NULL,
  new_last_name TEXT DEFAULT NULL,
  new_email TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_current_user BOOLEAN;
  current_email TEXT;
BEGIN
  -- Verify that the user is updating their own profile
  SELECT (user_id = auth.uid()) INTO is_current_user;
  
  IF NOT is_current_user THEN
    RAISE EXCEPTION 'Cannot update another user''s profile';
  END IF;
  
  -- If email is being updated, verify it's not already in use
  IF new_email IS NOT NULL THEN
    SELECT email INTO current_email FROM auth.users WHERE id = user_id;
    
    -- Only do this check if email is actually changing
    IF new_email != current_email THEN
      -- Check if email exists in auth.users
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
        RAISE EXCEPTION 'Email address already in use';
      END IF;
      
      -- Update email in auth.users - this will be handled by the application instead
      -- to properly handle auth system requirements
    END IF;
  END IF;
  
  -- Update the user profile in public.users
  UPDATE public.users
  SET 
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    updated_at = now()
  WHERE id = user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create function to increment lifetime message count
CREATE OR REPLACE FUNCTION "public"."increment_lifetime_message_count"(
  user_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  new_count INTEGER;
BEGIN
  -- Get current lifetime count
  SELECT lifetime_message_count INTO current_count
  FROM public.users
  WHERE id = user_id;
  
  -- If profile record doesn't exist yet, create it
  IF current_count IS NULL THEN
    INSERT INTO public.users (id, created_at, lifetime_message_count)
    VALUES (user_id, now(), 1)
    ON CONFLICT (id) DO UPDATE
    SET lifetime_message_count = COALESCE(public.users.lifetime_message_count, 0) + 1;
    
    new_count := 1;
  ELSE
    -- Increment the count
    new_count := current_count + 1;
    
    UPDATE public.users
    SET lifetime_message_count = new_count
    WHERE id = user_id;
  END IF;
  
  RETURN new_count;
END;
$$;

-- Create function to get lifetime message count
CREATE OR REPLACE FUNCTION "public"."get_lifetime_message_count"(
  user_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lifetime_count INTEGER;
BEGIN
  -- Get current lifetime count
  SELECT lifetime_message_count INTO lifetime_count
  FROM public.users
  WHERE id = user_id;
  
  RETURN COALESCE(lifetime_count, 0);
END;
$$;

-- Add first_name, last_name, and lifetime_message_count columns to profiles table
ALTER TABLE IF EXISTS "public"."profiles" 
ADD COLUMN IF NOT EXISTS "first_name" TEXT,
ADD COLUMN IF NOT EXISTS "last_name" TEXT,
ADD COLUMN IF NOT EXISTS "lifetime_message_count" INTEGER DEFAULT 0;

-- Drop all existing functions with any signature
DO $$
DECLARE
BEGIN
  -- Drop update_user_profile function if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_user_profile') THEN
    DROP FUNCTION IF EXISTS public.update_user_profile(uuid, text, text, text);
    DROP FUNCTION IF EXISTS public.update_user_profile(uuid, text, text);
  END IF;
  
  -- Drop increment_lifetime_message_count function if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_lifetime_message_count') THEN
    DROP FUNCTION IF EXISTS public.increment_lifetime_message_count(uuid);
  END IF;
  
  -- Drop get_lifetime_message_count function if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_lifetime_message_count') THEN
    DROP FUNCTION IF EXISTS public.get_lifetime_message_count(uuid);
  END IF;
END
$$;

-- Create function to update user profile
CREATE FUNCTION "public"."update_user_profile"(
  user_id UUID,
  new_first_name TEXT DEFAULT NULL,
  new_last_name TEXT DEFAULT NULL,
  new_email TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_current_user BOOLEAN;
  current_email TEXT;
BEGIN
  -- Verify that the user is updating their own profile
  SELECT (user_id = auth.uid()) INTO is_current_user;
  
  IF NOT is_current_user THEN
    RAISE EXCEPTION 'Cannot update another user''s profile';
  END IF;
  
  -- If email is being updated, verify it's not already in use
  IF new_email IS NOT NULL THEN
    SELECT email INTO current_email FROM auth.users WHERE id = user_id;
    
    -- Only do this check if email is actually changing
    IF new_email != current_email THEN
      -- Check if email exists in auth.users
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
        RAISE EXCEPTION 'Email address already in use';
      END IF;
      
      -- Update email in auth.users - this will be handled by the application instead
      -- to properly handle auth system requirements
    END IF;
  END IF;
  
  -- Update the user profile in public.profiles
  UPDATE public.profiles
  SET 
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    updated_at = now()
  WHERE id = user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create function to increment lifetime message count
CREATE FUNCTION "public"."increment_lifetime_message_count"(
  user_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  new_count INTEGER;
BEGIN
  -- Get current lifetime count
  SELECT lifetime_message_count INTO current_count
  FROM public.profiles
  WHERE id = user_id;
  
  -- If profile record doesn't exist yet, create it
  IF current_count IS NULL THEN
    INSERT INTO public.profiles (id, created_at, lifetime_message_count)
    VALUES (user_id, now(), 1)
    ON CONFLICT (id) DO UPDATE
    SET lifetime_message_count = COALESCE(public.profiles.lifetime_message_count, 0) + 1;
    
    new_count := 1;
  ELSE
    -- Increment the count
    new_count := current_count + 1;
    
    UPDATE public.profiles
    SET lifetime_message_count = new_count
    WHERE id = user_id;
  END IF;
  
  RETURN new_count;
END;
$$;

-- Create function to get lifetime message count
CREATE FUNCTION "public"."get_lifetime_message_count"(
  user_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lifetime_count INTEGER;
BEGIN
  -- Get current lifetime count
  SELECT lifetime_message_count INTO lifetime_count
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(lifetime_count, 0);
END;
$$; 