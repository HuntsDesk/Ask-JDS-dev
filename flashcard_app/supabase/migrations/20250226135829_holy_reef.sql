/*
  # Flashcards Application Schema

  1. New Tables
    - `flashcard_sets`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `user_id` (uuid, references auth.users)
      - `is_public` (boolean)
      - `created_at` (timestamp)
    
    - `flashcards`
      - `id` (uuid, primary key)
      - `set_id` (uuid, references flashcard_sets)
      - `question` (text)
      - `answer` (text)
      - `created_at` (timestamp)
      - `last_reviewed` (timestamp)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on both tables
    - Add policies for:
      - Users can read public flashcard sets
      - Users can read/write their own flashcard sets
      - Users can read/write their own flashcards
*/

-- Create flashcard_sets table
CREATE TABLE IF NOT EXISTS flashcard_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  user_id uuid REFERENCES auth.users NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid REFERENCES flashcard_sets ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_reviewed timestamptz,
  user_id uuid REFERENCES auth.users NOT NULL
);

-- Enable RLS
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Policies for flashcard_sets
CREATE POLICY "Users can read public flashcard sets"
  ON flashcard_sets
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can read their own flashcard sets"
  ON flashcard_sets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcard sets"
  ON flashcard_sets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard sets"
  ON flashcard_sets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard sets"
  ON flashcard_sets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for flashcards
CREATE POLICY "Users can read flashcards from public sets"
  ON flashcards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_sets
      WHERE flashcard_sets.id = flashcards.set_id
      AND (flashcard_sets.is_public = true OR flashcard_sets.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create their own flashcards"
  ON flashcards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
  ON flashcards
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
  ON flashcards
  FOR DELETE
  USING (auth.uid() = user_id);