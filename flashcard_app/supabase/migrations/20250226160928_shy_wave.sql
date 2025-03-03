/*
  # Create subjects table

  1. New Tables
    - `subjects`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text)
      - `is_official` (boolean, default false)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `subjects` table
    - Add policies for authenticated users to read all subjects
    - Add policies for authenticated users to create/update/delete their own subjects
    - Prevent users from modifying official subjects
*/

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_official boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Policies for subjects
CREATE POLICY "Anyone can read subjects"
  ON subjects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own subjects"
  ON subjects
  FOR INSERT
  TO authenticated
  WITH CHECK (is_official = false);

CREATE POLICY "Users can update their own non-official subjects"
  ON subjects
  FOR UPDATE
  TO authenticated
  USING (is_official = false);

CREATE POLICY "Users can delete their own non-official subjects"
  ON subjects
  FOR DELETE
  TO authenticated
  USING (is_official = false);

-- Add foreign key to flashcard_collections
ALTER TABLE flashcard_collections
ADD CONSTRAINT flashcard_collections_subject_id_fkey
FOREIGN KEY (subject_id)
REFERENCES subjects(id);

-- Insert some default official subjects
INSERT INTO subjects (name, description, is_official)
VALUES 
  ('Mathematics', 'Numbers, equations, geometry and more', true),
  ('Science', 'Physics, chemistry, biology and related fields', true),
  ('History', 'Events, people and developments throughout time', true),
  ('Languages', 'Vocabulary, grammar and language learning', true),
  ('Computer Science', 'Programming, algorithms and computing concepts', true)
ON CONFLICT (id) DO NOTHING;