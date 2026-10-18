-- Add receipt_url column to payment_records table
-- This stores the uploaded payment proof/receipt file URL

ALTER TABLE payment_records 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

COMMENT ON COLUMN payment_records.receipt_url IS 'URL/path to uploaded payment receipt/proof document';
