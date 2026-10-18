-- Step 1: Add is_public column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meetings' AND column_name = 'is_public'
    ) THEN
        ALTER TABLE meetings ADD COLUMN is_public BOOLEAN DEFAULT true NOT NULL;
        RAISE NOTICE 'Column is_public added to meetings table';
    ELSE
        RAISE NOTICE 'Column is_public already exists';
    END IF;
END $$;

-- Step 2: Set all existing meetings to public
UPDATE meetings SET is_public = true WHERE is_public IS NULL;

-- Step 3: Verify the changes
SELECT id, title, meeting_date, is_public FROM meetings ORDER BY meeting_date DESC LIMIT 10;
