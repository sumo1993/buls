-- Simple guest registrations table for non-members
CREATE TABLE IF NOT EXISTS guest_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Guest Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  message TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Timestamps
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_registrations_event_id ON guest_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_email ON guest_registrations(email);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_phone ON guest_registrations(phone);

-- Row Level Security
ALTER TABLE guest_registrations ENABLE ROW LEVEL SECURITY;

-- Anyone can insert
CREATE POLICY "Anyone can register as guest"
  ON guest_registrations
  FOR INSERT
  WITH CHECK (true);

-- Anyone can view (we'll handle privacy in API)
CREATE POLICY "Anyone can view guest registrations"
  ON guest_registrations
  FOR SELECT
  USING (true);

-- Only admin/secretary can update/delete
CREATE POLICY "Admins can manage guest registrations"
  ON guest_registrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND users.role IN ('admin', 'secretary')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON guest_registrations TO anon;
GRANT ALL ON guest_registrations TO authenticated;

-- Success message
SELECT 'Guest registrations table created successfully!' as message;
