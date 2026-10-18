-- Migration: Add Payment Proof URL to Guest Records
-- This allows guests to upload their own payment proofs

-- Add payment_proof_url column to ticket_guests table
ALTER TABLE ticket_guests 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN ticket_guests.payment_proof_url IS 'URL/path to guest uploaded payment proof/screenshot';

-- Add payment_method column if it doesn't exist (for tracking how guest paid)
ALTER TABLE ticket_guests 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

COMMENT ON COLUMN ticket_guests.payment_method IS 'Payment method used by guest (wechat, alipay, bank, cash, door, complimentary)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE 'Added payment_proof_url and payment_method columns to ticket_guests table';
END $$;
