-- Function to get error logs (secure way)
CREATE OR REPLACE FUNCTION get_error_logs()
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

-- Function to mark error as investigated
CREATE OR REPLACE FUNCTION mark_error_investigated(error_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can update error logs';
  END IF;

  UPDATE error_logs
  SET investigated = NOT investigated
  WHERE id = error_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_error_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_error_investigated(uuid) TO authenticated;

-- Function to get total users
CREATE OR REPLACE FUNCTION get_total_users()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total bigint;
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can view user statistics';
  END IF;

  SELECT COUNT(*) INTO total FROM auth.users;
  RETURN total;
END;
$$;

-- Function to get active users in last 24h
CREATE OR REPLACE FUNCTION get_active_users_24h()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count bigint;
BEGIN
  -- Check if the executing user is an admin
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can view user statistics';
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM auth.users
  WHERE last_sign_in_at >= NOW() - INTERVAL '24 hours';
  
  RETURN active_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_total_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_users_24h() TO authenticated;