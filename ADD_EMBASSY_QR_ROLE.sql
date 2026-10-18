-- Allow Embassy as a QR code owner role (WeChat / Alipay for consular fees)
-- Run in Supabase SQL Editor

ALTER TABLE qr_codes DROP CONSTRAINT IF EXISTS qr_codes_role_check;

ALTER TABLE qr_codes
  ADD CONSTRAINT qr_codes_role_check
  CHECK (role IN ('admin', 'treasurer', 'secretary', 'finance', 'embassy'));

COMMENT ON COLUMN qr_codes.role IS 'Role that owns the QR code: admin, treasurer, secretary, finance, or embassy';
