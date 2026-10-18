-- Alter qr_codes table to store Clerk user ID as text instead of UUID
-- This fixes the issue where Clerk's user_id format (user_...) doesn't match UUID format

-- Drop the existing foreign key constraint first
ALTER TABLE qr_codes DROP CONSTRAINT IF EXISTS qr_codes_created_by_fkey;

-- Change the created_by column type to TEXT
ALTER TABLE qr_codes ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Remove the NOT NULL constraint to allow NULL values (in case of sync issues)
ALTER TABLE qr_codes ALTER COLUMN created_by DROP NOT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN qr_codes.created_by IS 'Clerk user ID of the user who created this QR code';
