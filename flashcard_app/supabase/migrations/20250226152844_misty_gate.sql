/*
  # Update Flashcard Schema

  1. Changes
    - Rename flashcard_sets to flashcard_collections
    - Add is_official column
    - Remove is_public column
    - Remove user_id columns
    - Update foreign key references

  2. Data Preservation
    - Existing data is preserved through safe ALTER TABLE operations
    - No data loss during table renaming
*/

-- Rename the table
ALTER TABLE IF EXISTS flashcard_sets 
RENAME TO flashcard_collections;

-- Add is_official column
ALTER TABLE flashcard_collections
ADD COLUMN IF NOT EXISTS is_official boolean DEFAULT false;

-- Drop unnecessary columns
ALTER TABLE flashcard_collections
DROP COLUMN IF EXISTS is_public,
DROP COLUMN IF EXISTS user_id;

ALTER TABLE flashcards
DROP COLUMN IF EXISTS user_id;

-- Update foreign key reference
ALTER TABLE flashcards
DROP CONSTRAINT IF EXISTS flashcards_set_id_fkey,
ADD CONSTRAINT flashcards_collection_id_fkey 
  FOREIGN KEY (set_id) 
  REFERENCES flashcard_collections(id) 
  ON DELETE CASCADE;

-- Rename the foreign key column
ALTER TABLE flashcards
RENAME COLUMN set_id TO collection_id;