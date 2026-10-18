-- Rename guest_registrations table to non_member_registrations
ALTER TABLE guest_registrations RENAME TO non_member_registrations;

-- Rename indexes
ALTER INDEX IF EXISTS idx_guest_registrations_event_id RENAME TO idx_non_member_registrations_event_id;
ALTER INDEX IF EXISTS idx_guest_registrations_email RENAME TO idx_non_member_registrations_email;
ALTER INDEX IF EXISTS idx_guest_registrations_phone RENAME TO idx_non_member_registrations_phone;

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can register as guest" ON non_member_registrations;
DROP POLICY IF EXISTS "Anyone can view guest registrations" ON non_member_registrations;
DROP POLICY IF EXISTS "Admins can manage guest registrations" ON non_member_registrations;

-- Create new policies with correct names
CREATE POLICY "Anyone can register as non-member"
  ON non_member_registrations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view non-member registrations"
  ON non_member_registrations
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage non-member registrations"
  ON non_member_registrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND users.role IN ('admin', 'secretary')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON non_member_registrations TO anon;
GRANT ALL ON non_member_registrations TO authenticated;

-- Verify rename
SELECT 'Table renamed successfully!' as message;
SELECT tablename FROM pg_tables WHERE tablename = 'non_member_registrations';
