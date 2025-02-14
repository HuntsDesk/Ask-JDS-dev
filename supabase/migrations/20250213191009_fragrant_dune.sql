-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own threads" ON threads;
DROP POLICY IF EXISTS "Users can create own threads" ON threads;
DROP POLICY IF EXISTS "Users can update own threads" ON threads;
DROP POLICY IF EXISTS "Users can delete own threads" ON threads;

-- Create simplified policies
CREATE POLICY "threads_select_policy"
  ON threads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "threads_insert_policy"
  ON threads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "threads_update_policy"
  ON threads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "threads_delete_policy"
  ON threads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS threads_user_id_idx ON threads(user_id);
CREATE INDEX IF NOT EXISTS threads_created_at_idx ON threads(created_at);