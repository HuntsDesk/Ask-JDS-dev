-- Function to get all users (secure way)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can view user data';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    au.raw_user_meta_data
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

-- Function to upgrade a user to admin
CREATE OR REPLACE FUNCTION upgrade_to_admin(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can upgrade users to admin status';
  END IF;

  -- Update the user's metadata to include admin status
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('is_admin', true)
      ELSE raw_user_meta_data || jsonb_build_object('is_admin', true)
    END
  WHERE id = user_id;
END;
$$;

-- Function to revoke admin status
CREATE OR REPLACE FUNCTION revoke_admin(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can revoke admin status';
  END IF;

  -- Update the user's metadata to remove admin status
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data - 'is_admin'
  WHERE id = user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upgrade_to_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_admin(uuid) TO authenticated;

-- Update the error logs function
CREATE OR REPLACE FUNCTION public.get_error_logs()
RETURNS TABLE (
  id uuid,
  message text,
  stack_trace text,
  investigated boolean,
  created_at timestamptz,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can view error logs';
  END IF;

  RETURN QUERY
  SELECT el.*
  FROM error_logs el
  ORDER BY el.created_at DESC;
END;
$$;

-- Make sure to grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_error_logs() TO authenticated;