-- =====================================================
-- DISABLE RLS FOR BIRTHDAY_PHOTOS TABLE
-- =====================================================
-- This disables RLS to allow Clerk auth to work
-- =====================================================

-- Disable RLS completely for birthday_photos (for Clerk auth compatibility)
ALTER TABLE birthday_photos DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS DISABLED
-- =====================================================
