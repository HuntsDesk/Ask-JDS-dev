/*
  # Fix Threads RLS Policies

  1. Changes
    - Drop and recreate RLS policies for threads table
    - Add proper user_id check for insert policy
    - Add default value for user_id column
    
  2. Security
    - Ensure proper user_id checks
    - Maintain RLS security
*/

-- Drop existing policies
DROP POLICY IF EXISTS "threads_select_policy" ON threads;
DROP POLICY IF EXISTS "threads_insert_policy" ON threads;
DROP POLICY IF EXISTS "threads_update_policy" ON threads;
DROP POLICY IF EXISTS "threads_delete_policy" ON threads;

-- Create new policies with proper user_id handling
CREATE POLICY "threads_select_policy"
  ON threads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "threads_insert_policy"
  ON threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(user_id, auth.uid()) = auth.uid()
  );

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

-- Ensure user_id has a default value
ALTER TABLE threads 
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS threads_user_id_idx ON threads(user_id);
CREATE INDEX IF NOT EXISTS threads_created_at_idx ON threads(created_at);