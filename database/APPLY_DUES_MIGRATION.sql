-- =====================================================
-- APPLY THIS MIGRATION TO ENABLE DUES CALCULATION SYSTEM
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- First, run the complete migration file: DUES_MATRIX_IMPLEMENTATION.sql
-- Then verify with these commands:

-- Check dues_structure table was created
SELECT COUNT(*) as dues_structures_count FROM dues_structure;

-- Check function was created
SELECT proname FROM pg_proc WHERE proname = 'calculate_monthly_due';

-- Test the function with a sample calculation
-- Replace 'USER_UUID_HERE' with an actual user UUID from your database
-- SELECT calculate_monthly_due('USER_UUID_HERE');

-- Update all existing members' due amounts
UPDATE members_profile mp
SET monthly_due_amount = calculate_monthly_due(mp.user_id),
    updated_at = NOW()
WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = mp.user_id);

-- Verify the update
SELECT 
  u.full_name,
  mp.scholarship_type,
  ur.rank_name,
  ur.rank_level,
  mp.monthly_due_amount,
  calculate_monthly_due(u.id) as calculated_due
FROM users u
LEFT JOIN members_profile mp ON mp.user_id = u.id
LEFT JOIN union_ranks ur ON ur.id = u.union_rank_id
ORDER BY u.full_name
LIMIT 10;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
