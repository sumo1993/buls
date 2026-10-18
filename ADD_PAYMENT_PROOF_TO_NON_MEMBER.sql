-- Add payment_proof_url column to non_member_registrations table
ALTER TABLE non_member_registrations 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Add payment_pending status if not exists
-- First check current constraint
DO $$ 
BEGIN
    -- Drop existing constraint
    ALTER TABLE non_member_registrations 
    DROP CONSTRAINT IF EXISTS non_member_registrations_status_check;
    
    -- Add new constraint with payment_pending status
    ALTER TABLE non_member_registrations
    ADD CONSTRAINT non_member_registrations_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'payment_pending'));
END $$;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'non_member_registrations' 
AND column_name = 'payment_proof_url';
