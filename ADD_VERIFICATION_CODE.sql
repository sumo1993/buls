-- Add verification_code column to non_member_registrations table
ALTER TABLE non_member_registrations 
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(5) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_non_member_verification_code 
ON non_member_registrations(verification_code);

-- Verify
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'non_member_registrations' 
AND column_name = 'verification_code';
