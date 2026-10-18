-- Check users table schema
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check if phone_number exists in any table
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE column_name LIKE '%phone%' 
   OR column_name LIKE '%passport%'
ORDER BY table_name, column_name;

-- Quick fix: Add missing columns if they don't exist
DO $$
BEGIN
  -- Add phone_number if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE users ADD COLUMN phone_number TEXT;
    RAISE NOTICE 'Added phone_number column to users table';
  END IF;
  
  -- Add passport_number if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'passport_number'
  ) THEN
    ALTER TABLE users ADD COLUMN passport_number TEXT;
    RAISE NOTICE 'Added passport_number column to users table';
  END IF;
END $$;

-- Verify
SELECT 'Users table columns:' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' ORDER BY ordinal_position;