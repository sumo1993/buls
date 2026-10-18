-- Fix RLS policies for non_member_registrations table
-- This allows treasurer/admin to update registration status

-- First, disable RLS temporarily to check current state
ALTER TABLE non_member_registrations DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE non_member_registrations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Anyone can insert non_member_registrations" ON non_member_registrations;
DROP POLICY IF EXISTS "Authenticated users can view non_member_registrations" ON non_member_registrations;
DROP POLICY IF EXISTS "Admins can update non_member_registrations" ON non_member_registrations;
DROP POLICY IF EXISTS "Allow all operations on non_member_registrations" ON non_member_registrations;

-- Policy 1: Anyone can insert (for public registration)
CREATE POLICY "Anyone can insert non_member_registrations"
ON non_member_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy 2: Authenticated users can view all registrations
CREATE POLICY "Authenticated users can view non_member_registrations"
ON non_member_registrations
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Authenticated users can update all registrations
-- (You can restrict this to specific roles if needed)
CREATE POLICY "Authenticated users can update non_member_registrations"
ON non_member_registrations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Authenticated users can delete (if needed for refunds/cancellations)
CREATE POLICY "Authenticated users can delete non_member_registrations"
ON non_member_registrations
FOR DELETE
TO authenticated
USING (true);

-- Grant permissions to authenticated role
GRANT ALL ON non_member_registrations TO authenticated;
GRANT ALL ON non_member_registrations TO anon;
