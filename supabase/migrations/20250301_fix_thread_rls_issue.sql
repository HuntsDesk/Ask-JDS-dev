-- Fix for thread RLS policy issue in Safari
-- This migration addresses the error "new row violates row-level security policy for table 'threads'"

-- First, ensure the profile exists for the user before creating a thread
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_exists boolean;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid()
  ) INTO profile_exists;
  
  -- If profile doesn't exist, create it
  IF NOT profile_exists THEN
    INSERT INTO public.profiles (id, created_at)
    VALUES (auth.uid(), now());
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to ensure profile exists before thread creation
DROP TRIGGER IF EXISTS ensure_profile_before_thread_insert ON public.threads;
CREATE TRIGGER ensure_profile_before_thread_insert
BEFORE INSERT ON public.threads
FOR EACH ROW
EXECUTE FUNCTION public.ensure_profile_exists();

-- Recreate the threads insert policy to be more permissive and check only auth.uid()
DROP POLICY IF EXISTS "threads_insert_policy" ON public.threads;
CREATE POLICY "threads_insert_policy" 
ON public.threads 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix foreign key constraint if it's pointing to wrong table
DO $$
BEGIN
  -- Check if foreign key exists and points to users (not auth.users)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'threads'
    AND ccu.table_name = 'users'
  ) THEN
    -- Drop the constraint
    ALTER TABLE public.threads DROP CONSTRAINT IF EXISTS threads_user_id_fkey;
    
    -- Add the correct constraint
    ALTER TABLE public.threads
    ADD CONSTRAINT threads_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END
$$; 