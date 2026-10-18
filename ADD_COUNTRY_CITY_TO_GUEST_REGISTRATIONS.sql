-- Add country and city columns to guest_registrations table
ALTER TABLE guest_registrations 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Update address column to be optional (it can stay for additional address details)
ALTER TABLE guest_registrations 
ALTER COLUMN address DROP NOT NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'guest_registrations' 
AND column_name IN ('country', 'city', 'education_level', 'address')
ORDER BY column_name;
