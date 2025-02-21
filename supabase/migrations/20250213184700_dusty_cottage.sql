/*
  # Admin Management Functions
  
  1. Functions
    - create_first_admin: Creates the first admin user
    - has_any_admin: Checks if any admin users exist
    - upgrade_to_admin: Allows admins to promote other users
    - revoke_admin: Allows admins to demote other users
  
  2. Security
    - Security definer functions
    - Proper permissions
    - Input validation
*/

-- Function to create the first admin user
CREATE OR REPLACE FUNCTION public.create_first_admin(admin_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Check if any admin users already exist
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE raw_user_meta_data->>'is_admin' = 'true'
  ) THEN
    RAISE EXCEPTION 'Cannot create first admin: admin users already exist';
  END IF;

  -- Get the user ID for the target email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = admin_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;

  -- Update the user's metadata to make them an admin
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('is_admin', true)
      ELSE raw_user_meta_data || jsonb_build_object('is_admin', true)
    END
  WHERE id = target_user_id;
END;
$$;

-- Function to check if any admins exist
CREATE OR REPLACE FUNCTION public.has_any_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE raw_user_meta_data->>'is_admin' = 'true'
  );
END;
$$;

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_first_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_to_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin(text) TO authenticated;