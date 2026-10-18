-- Add admin payment QR code for public registrations
-- This QR code will be shown to non-members who need to pay for tickets

-- Add payment QR code to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS payment_qr_code_url TEXT;

COMMENT ON COLUMN events.payment_qr_code_url IS 'Admin WeChat/Alipay QR code for public payments';

-- Add payment option field to public_registrations
ALTER TABLE public_registrations 
ADD COLUMN IF NOT EXISTS payment_option TEXT DEFAULT 'online' CHECK (payment_option IN ('online', 'at_gate'));

COMMENT ON COLUMN public_registrations.payment_option IS 'How user will pay: online (scan QR + upload proof) or at_gate (pay at entrance)';

-- Verify
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name = 'payment_qr_code_url';

SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'public_registrations' 
AND column_name = 'payment_option';
