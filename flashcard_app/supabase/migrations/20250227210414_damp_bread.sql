/*
  # Flashcard improvements

  1. New Columns
    - Add `is_mastered` boolean column to `flashcards` table
    - Add `position` integer column to `flashcards` table for ordering

  2. Security
    - Update policies to account for new columns
*/

-- Add is_mastered column to flashcards
ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS is_mastered boolean DEFAULT false;

-- Add position column to flashcards for ordering
ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;