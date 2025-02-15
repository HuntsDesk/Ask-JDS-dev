/*
  # Add system prompts table

  1. New Tables
    - `system_prompts`
      - `id` (uuid, primary key)
      - `content` (text, the prompt content)
      - `is_active` (boolean, only one prompt can be active)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on `system_prompts` table
    - Add policies for admin users to manage prompts
    - Add policies for all users to read active prompt
*/

-- Create system_prompts table
CREATE TABLE IF NOT EXISTS system_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;

-- Policies for admin users
CREATE POLICY "Admins can manage system prompts"
  ON system_prompts
  FOR ALL
  TO authenticated
  USING (auth.is_admin(auth.uid()))
  WITH CHECK (auth.is_admin(auth.uid()));

-- Policy for reading active prompt
CREATE POLICY "All users can read active prompt"
  ON system_prompts
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Function to ensure only one active prompt
CREATE OR REPLACE FUNCTION ensure_single_active_prompt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE system_prompts
    SET is_active = false
    WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain single active prompt
CREATE TRIGGER ensure_single_active_prompt_trigger
  BEFORE INSERT OR UPDATE OF is_active
  ON system_prompts
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_prompt();

-- Insert default system prompt
INSERT INTO system_prompts (content, is_active, created_by)
SELECT 
  'You are a legal study assistant, helping law students understand complex legal concepts and prepare for exams. 

Your responses should be:
- Clear and educational
- Focused on legal principles and concepts
- Include relevant case law when appropriate
- Avoid giving actual legal advice
- Professional and accurate

Format your responses with:
- Clear paragraph breaks for readability
- Bullet points for lists
- Examples when helpful
- Citations where relevant',
  true,
  id
FROM auth.users
WHERE raw_user_meta_data->>'is_admin' = 'true'
LIMIT 1;