/*
  # Add First Admin User Function
  
  1. New Function
    - `create_first_admin(email text)`: Creates the first admin user in the system
    
  2. Security
    - Can only be used when no admin users exist
    - Requires valid user email
    - Proper error handling and validation
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_first_admin(text) TO authenticated;

-- Add helper function to check if any admins exist
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

GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;