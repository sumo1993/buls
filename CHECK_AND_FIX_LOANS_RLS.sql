-- Check current RLS policies on loans table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'loans';

-- Check if RLS is enabled on loans table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'loans' AND schemaname = 'public';

-- Disable RLS on loans table (since we're using server-side authentication)
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;

-- OR if you want to keep RLS enabled, create proper policies:
-- First drop existing policies
DROP POLICY IF EXISTS "Users can view their own loans" ON loans;
DROP POLICY IF EXISTS "Admin and secretary can view all loans" ON loans;
DROP POLICY IF EXISTS "Users can create their own loans" ON loans;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON loans;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON loans;
DROP POLICY IF EXISTS "Enable all for service role" ON loans;

-- Create comprehensive policies that work with our authentication
-- Note: These policies won't work because we're using Clerk auth, not Supabase auth
-- Better to disable RLS entirely since we handle auth in the API layer

-- Verify RLS is now disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'loans' AND schemaname = 'public';

-- Test: Count all loans in the table
SELECT COUNT(*) as total_loans FROM loans;

-- Test: Show recent loans with user info
SELECT 
    l.id,
    l.user_id,
    u.full_name,
    u.clerk_id,
    l.amount,
    l.status,
    l.created_at
FROM loans l
JOIN users u ON l.user_id = u.id
ORDER BY l.created_at DESC
LIMIT 10;
