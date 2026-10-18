-- Fix the constraint name and add payment_proof_url column
-- This handles the old 'guest_registrations_status_check' constraint

-- Add payment_proof_url column if not exists
ALTER TABLE non_member_registrations 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Drop old constraint (from when table was called guest_registrations)
ALTER TABLE non_member_registrations 
DROP CONSTRAINT IF EXISTS guest_registrations_status_check;

-- Drop any existing non_member constraint
ALTER TABLE non_member_registrations 
DROP CONSTRAINT IF EXISTS non_member_registrations_status_check;

-- Add new constraint with payment_pending status
ALTER TABLE non_member_registrations
ADD CONSTRAINT non_member_registrations_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'payment_pending'));

-- Verify the changes
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'non_member_registrations' 
AND con.contype = 'c';
