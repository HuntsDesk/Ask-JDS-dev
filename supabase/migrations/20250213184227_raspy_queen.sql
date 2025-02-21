/*
  # Add Admin Upgrade Function
  
  1. New Functions
    - `upgrade_to_admin(email text)`: Upgrades a user to admin status by email
    - `revoke_admin(email text)`: Revokes admin status from a user
  
  2. Security
    - Functions are security definer to run with elevated privileges
    - Only existing admins can call these functions
    - Proper error handling and validation
*/

-- Function to upgrade a user to admin status
CREATE OR REPLACE FUNCTION public.upgrade_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'is_admin' = 'true'
  ) THEN
    RAISE EXCEPTION 'Only administrators can upgrade users to admin status';
  END IF;

  -- Get the user ID for the target email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;

  -- Update the user's metadata to include admin status
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('is_admin', true)
      ELSE raw_user_meta_data || jsonb_build_object('is_admin', true)
    END
  WHERE id = target_user_id;
END;
$$;

-- Function to revoke admin status
CREATE OR REPLACE FUNCTION public.revoke_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'is_admin' = 'true'
  ) THEN
    RAISE EXCEPTION 'Only administrators can revoke admin status';
  END IF;

  -- Get the user ID for the target email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;

  -- Update the user's metadata to remove admin status
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data - 'is_admin'
  WHERE id = target_user_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.upgrade_to_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin(text) TO authenticated;

-- Add helper function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT (raw_user_meta_data->>'is_admin')::boolean
  INTO is_admin
  FROM auth.users
  WHERE id = user_id;
  
  RETURN COALESCE(is_admin, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;