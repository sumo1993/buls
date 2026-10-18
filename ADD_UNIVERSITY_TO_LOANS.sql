-- Add university field to loans table

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS university VARCHAR(255);

COMMENT ON COLUMN loans.university IS 'University where the member is studying';

-- Create index for university filtering
CREATE INDEX IF NOT EXISTS idx_loans_university ON loans(university) WHERE university IS NOT NULL;
