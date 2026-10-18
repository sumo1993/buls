-- Add is_public column to meetings table
-- This column determines if a meeting is visible to all members on their dashboard

-- Add the column (default to true for existing meetings)
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true NOT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN meetings.is_public IS 'Whether this meeting is visible to all members (true) or only admin/secretary (false)';

-- Create an index for faster queries when filtering public meetings
CREATE INDEX IF NOT EXISTS idx_meetings_is_public ON meetings(is_public);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'meetings' AND column_name = 'is_public';
