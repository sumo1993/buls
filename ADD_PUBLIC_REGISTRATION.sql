-- Add public registration feature for non-members
-- This allows external visitors to register for events from the website

-- Step 1: Add new columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS allow_public_registration BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_guest_approval BOOLEAN DEFAULT true;

COMMENT ON COLUMN events.allow_public_registration IS 'Whether non-members can register for this event from public page';
COMMENT ON COLUMN events.require_guest_approval IS 'Whether public registrations need secretary/admin approval';

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
  payment_method TEXT, -- 'wechat', 'alipay', 'bank_transfer', 'cash'
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_registrations_event_id ON public_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_public_registrations_status ON public_registrations(status);
CREATE INDEX IF NOT EXISTS idx_public_registrations_email ON public_registrations(email);
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
CREATE TRIGGER update_public_registrations_updated_at
  BEFORE UPDATE ON public_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_public_registrations_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public_registrations TO anon;
GRANT ALL ON public_registrations TO authenticated;

-- Verification queries
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'public_registrations'
ORDER BY ordinal_position;

-- Check events table columns
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('allow_public_registration', 'require_guest_approval');

-- Sample query to verify
SELECT 
  id, 
  title, 
  allow_public_registration, 
  require_guest_approval,
  event_type
FROM events
LIMIT 5;
