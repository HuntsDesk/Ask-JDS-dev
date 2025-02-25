-- Create auth.is_admin() function that checks the current user
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'is_admin' = 'true'
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated;

-- Notify Supabase to reload the schema
SELECT pg_notify('supabase_realtime', 'reload_schema'); 