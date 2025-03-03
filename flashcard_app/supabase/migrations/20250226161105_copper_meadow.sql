/*
  # Fix subjects table structure

  1. Changes:
    - Add is_official column if it doesn't exist
    - Ensure proper constraints and defaults
  2. Security:
    - No changes to existing policies
*/

-- Check if is_official column exists and add it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects' AND column_name = 'is_official'
  ) THEN
    ALTER TABLE subjects ADD COLUMN is_official boolean DEFAULT false;
  END IF;
END $$;

-- Re-insert default subjects to ensure they exist
INSERT INTO subjects (name, description, is_official)
VALUES 
  ('Mathematics', 'Numbers, equations, geometry and more', true),
  ('Science', 'Physics, chemistry, biology and related fields', true),
  ('History', 'Events, people and developments throughout time', true),
  ('Languages', 'Vocabulary, grammar and language learning', true),
  ('Computer Science', 'Programming, algorithms and computing concepts', true)
ON CONFLICT (name) 
DO UPDATE SET 
  description = EXCLUDED.description,
  is_official = true;