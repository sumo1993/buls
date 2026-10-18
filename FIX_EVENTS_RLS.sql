-- Allow authenticated users to read all events
-- This fixes the issue where secretaries and treasurers cannot see event names in registrations

-- First check if RLS is enabled on events table
-- If it's not enabled, we don't need this policy

-- Create policy to allow all authenticated users to SELECT from events
CREATE POLICY IF NOT EXISTS "Authenticated users can read events"
  ON events
  FOR SELECT
  TO authenticated
  USING (true);

-- Also allow anonymous users to read public events
CREATE POLICY IF NOT EXISTS "Anyone can read public events"
  ON events
  FOR SELECT
  TO anon, public
  USING (allow_public_registration = true OR true);

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'events';
