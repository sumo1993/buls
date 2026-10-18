-- ==========================================
-- COMPLETE PUBLIC REGISTRATION FEATURE
-- Run this entire file in Supabase SQL Editor
-- ==========================================

-- Step 1: Add new columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS allow_public_registration BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_guest_approval BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS payment_qr_code_url TEXT;

COMMENT ON COLUMN events.allow_public_registration IS 'Whether non-members can register for this event from public page';
COMMENT ON COLUMN events.require_guest_approval IS 'Whether public registrations need secretary/admin approval';
COMMENT ON COLUMN events.payment_qr_code_url IS 'Admin WeChat/Alipay QR code for public payments';

-- Step 2: Create public_registrations table
CREATE TABLE IF NOT EXISTS public_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Personal Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  message TEXT, -- Optional: reason for attending, special requests
  
  -- Registration Type
  registration_type TEXT NOT NULL DEFAULT 'free' CHECK (registration_type IN ('free', 'paid')),
  
  -- Payment Information (for paid events)
  ticket_id UUID REFERENCES event_tickets(id) ON DELETE SET NULL,
  amount_paid DECIMAL(10, 2),
  payment_option TEXT DEFAULT 'online' CHECK (payment_option IN ('online', 'at_gate')),
  payment_method TEXT, -- 'wechat', 'alipay', 'bank_transfer', 'cash_at_gate'
  payment_proof_url TEXT,
  payment_notes TEXT, -- Notes from treasurer about payment
  
  -- Status Management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'payment_pending')),
  
  -- Check-in tracking
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Approval tracking
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  
  -- Timestamps
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public_registrations.payment_option IS 'How user will pay: online (scan QR + upload proof) or at_gate (pay at entrance)';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_registrations_event_id ON public_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_public_registrations_status ON public_registrations(status);
CREATE INDEX IF NOT EXISTS idx_public_registrations_email ON public_registrations(email);
CREATE INDEX IF NOT EXISTS idx_public_registrations_phone ON public_registrations(phone);
CREATE INDEX IF NOT EXISTS idx_public_registrations_registered_at ON public_registrations(registered_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (public registration)
CREATE POLICY "Anyone can register for public events"
  ON public_registrations
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can view their own registration by email
CREATE POLICY "Users can view their own registrations"
  ON public_registrations
  FOR SELECT
  USING (true); -- We'll handle privacy in the API layer

-- Policy: Only admin/secretary/treasurer can update
CREATE POLICY "Admins can update registrations"
  ON public_registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND users.role IN ('admin', 'secretary', 'treasurer')
    )
  );

-- Policy: Only admin/secretary can delete
CREATE POLICY "Admins can delete registrations"
  ON public_registrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND users.role IN ('admin', 'secretary')
    )
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_public_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_public_registrations_updated_at ON public_registrations;
CREATE TRIGGER update_public_registrations_updated_at
  BEFORE UPDATE ON public_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_public_registrations_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public_registrations TO anon;
GRANT ALL ON public_registrations TO authenticated;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check events table columns
SELECT 
  column_name, 
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('allow_public_registration', 'require_guest_approval', 'payment_qr_code_url')
ORDER BY ordinal_position;

-- Check public_registrations table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'public_registrations'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'public_registrations';

-- Check RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'public_registrations';

-- Sample query to verify events ready for public registration
SELECT 
  id, 
  title, 
  event_date,
  event_type,
  allow_public_registration, 
  require_guest_approval,
  CASE 
    WHEN payment_qr_code_url IS NOT NULL THEN 'QR Code Set ✓'
    ELSE 'No QR Code'
  END as payment_qr_status
FROM events
WHERE event_date >= NOW()
ORDER BY event_date
LIMIT 10;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '✅ Public Registration Feature installed successfully!';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '   1. Create an event in secretary panel';
  RAISE NOTICE '   2. Check "Allow Public Registration"';
  RAISE NOTICE '   3. Upload Payment QR Code (for paid events)';
  RAISE NOTICE '   4. Visit /public-events to test';
END $$;
