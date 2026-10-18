-- Create QR codes table for payment method QR codes (WeChat, Alipay, etc.)
-- Admin can upload QR codes and grant access to other roles

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'treasurer', 'secretary', 'finance')),
  qr_code_url TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('wechat', 'alipay', 'bank_transfer')),
  title TEXT,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_qr_codes_role ON qr_codes(role);
CREATE INDEX IF NOT EXISTS idx_qr_codes_payment_method ON qr_codes(payment_method);
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON qr_codes(created_at);

-- Enable Row Level Security
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can upload and manage all QR codes
CREATE POLICY "Admins can manage all QR codes"
ON qr_codes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE clerk_id = auth.uid()::text 
    AND role::text = 'admin'
  )
);

-- Policy: Roles can view their own QR codes
CREATE POLICY "Roles can view their QR codes"
ON qr_codes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE clerk_id = auth.uid()::text 
    AND role::text = qr_codes.role
  )
  OR
  role::text = 'admin'
);

-- Policy: Roles can update their own QR codes
CREATE POLICY "Roles can update their QR codes"
ON qr_codes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE clerk_id = auth.uid()::text 
    AND role::text = qr_codes.role
  )
);

-- Policy: Roles can delete their own QR codes
CREATE POLICY "Roles can delete their QR codes"
ON qr_codes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE clerk_id = auth.uid()::text 
    AND role::text = qr_codes.role
  )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_qr_codes_updated_at
BEFORE UPDATE ON qr_codes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE qr_codes IS 'Stores payment method QR codes (WeChat, Alipay, Bank Transfer)';
COMMENT ON COLUMN qr_codes.role IS 'Role that owns the QR code: admin, treasurer, secretary, or finance';
COMMENT ON COLUMN qr_codes.qr_code_url IS 'Base64-encoded QR code image or URL';
COMMENT ON COLUMN qr_codes.payment_method IS 'Type of payment method: wechat, alipay, or bank_transfer';
COMMENT ON COLUMN qr_codes.title IS 'Optional title for the QR code';
COMMENT ON COLUMN qr_codes.description IS 'Optional description for the QR code';


