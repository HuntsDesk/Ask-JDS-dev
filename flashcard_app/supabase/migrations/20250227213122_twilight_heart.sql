/*
  # Add mastered card functionality

  1. Changes
    - Add `is_mastered` column to flashcards table to track mastered cards
    - Add `position` column to flashcards table for ordering
*/

-- Add is_mastered column to flashcards if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'is_mastered'
  ) THEN
    ALTER TABLE flashcards 
    ADD COLUMN is_mastered boolean DEFAULT false;
  END IF;
END $$;

-- Add position column to flashcards for ordering if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'position'
  ) THEN
    ALTER TABLE flashcards 
    ADD COLUMN position integer DEFAULT 0;
  END IF;
END $$;