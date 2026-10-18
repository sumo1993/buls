-- Add refund columns to non_member_registrations table
-- Run this in Supabase SQL Editor

-- Add refund-related columns
ALTER TABLE non_member_registrations 
ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS refund_proof_url TEXT;

-- Create index for refunded_by for faster lookups
CREATE INDEX IF NOT EXISTS idx_non_member_refunded_by ON non_member_registrations(refunded_by);

-- Create index for refunded_at for faster date filtering
CREATE INDEX IF NOT EXISTS idx_non_member_refunded_at ON non_member_registrations(refunded_at);

-- Add 'refunded' to status check constraint
DO $$ 
BEGIN
    -- Drop existing constraint
    ALTER TABLE non_member_registrations 
    DROP CONSTRAINT IF EXISTS non_member_registrations_status_check;
    
    -- Add new constraint with refunded status
    ALTER TABLE non_member_registrations
    ADD CONSTRAINT non_member_registrations_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'payment_pending', 'refunded'));
END $$;

-- Add comments to explain the columns
COMMENT ON COLUMN non_member_registrations.refunded_by IS 'User ID who processed the refund (treasurer/admin)';
COMMENT ON COLUMN non_member_registrations.refunded_at IS 'Timestamp when the refund was processed';
COMMENT ON COLUMN non_member_registrations.refund_reason IS 'Reason provided for the refund';
COMMENT ON COLUMN non_member_registrations.refund_amount IS 'Amount refunded to the non-member';
COMMENT ON COLUMN non_member_registrations.refund_proof_url IS 'URL to the refund receipt/proof image';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'non_member_registrations'
  AND column_name IN ('refunded_by', 'refunded_at', 'refund_reason', 'refund_amount', 'refund_proof_url')
ORDER BY column_name;
