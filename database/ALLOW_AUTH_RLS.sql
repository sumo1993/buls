-- Allow anon key to read users for authentication
-- This is needed for NextAuth credentials provider

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow anon read users for auth" ON users;

-- Create policy to allow anon key to read users
CREATE POLICY "Allow anon read users for auth"
ON users
FOR SELECT
TO anon
USING (true);

-- Allow anon key to check email exists (for signup)
DROP POLICY IF EXISTS "Allow anon check email exists" ON users;

CREATE POLICY "Allow anon check email exists"
ON users
FOR SELECT
TO anon
USING (true);
