-- Add qr_code_url column to ticket_purchases table
-- This column will store the base64-encoded QR code image data

ALTER TABLE ticket_purchases 
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN ticket_purchases.qr_code_url IS 'Base64-encoded QR code image (data URL) for ticket validation';

-- Create index for faster queries on tickets without QR codes
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_qr_code_url 
ON ticket_purchases(qr_code_url) 
WHERE qr_code_url IS NULL;
