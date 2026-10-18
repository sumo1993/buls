-- ============================================
-- 🔧 FIX RLS POLICY FOR USER CREATION
-- ============================================
-- Run this in Supabase SQL Editor to allow user creation via browser client

-- COMPLETELY DISABLE RLS FOR USERS TABLE (simplest fix for development)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ALSO DISABLE RLS FOR MEMBERS_PROFILE TABLE
ALTER TABLE members_profile DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled for both tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'members_profile');
