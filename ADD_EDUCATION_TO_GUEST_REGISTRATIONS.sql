-- Add education level to guest_registrations table
ALTER TABLE guest_registrations 
ADD COLUMN IF NOT EXISTS education_level TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'guest_registrations' 
AND column_name = 'education_level';
