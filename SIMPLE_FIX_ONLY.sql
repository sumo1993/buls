-- SIMPLE FIX: Add phone_number and passport_number columns only
-- Run this first to fix the immediate issue

-- 1. Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_number TEXT;

-- 2. Verify columns were added
SELECT '=== VERIFICATION ===' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('phone_number', 'passport_number', 'is_member', 'membership_number')
ORDER BY column_name;

-- 3. Sync data from members_profile if it exists
SELECT '=== DATA SYNC OPTION ===' as info;
SELECT 'If phone/passport data exists in members_profile table, run this:' as instruction;
SELECT '
UPDATE users u
SET 
  phone_number = COALESCE(u.phone_number, mp.phone),
  passport_number = COALESCE(u.passport_number, mp.passport_number)
FROM members_profile mp
WHERE u.id = mp.user_id
  AND (mp.phone IS NOT NULL OR mp.passport_number IS NOT NULL);
' as sync_sql;

-- 4. Add some test data (optional)
SELECT '=== TEST DATA OPTION ===' as info;
SELECT 'To add test phone/passport data for testing:' as instruction;
SELECT '
UPDATE users 
SET 
  phone_number = CASE id % 3 
    WHEN 0 THEN ''7054636640''
    WHEN 1 THEN ''7054636641''
    WHEN 2 THEN ''7054636642''
  END,
  passport_number = CASE id % 3
    WHEN 0 THEN ''AB123456''
    WHEN 1 THEN ''CD789012''
    WHEN 2 THEN ''EF345678''
  END
WHERE phone_number IS NULL
LIMIT 5;
' as test_data_sql;

SELECT '=== FIX COMPLETE ===' as info;
SELECT 'Phone and passport columns added to users table' as message;
SELECT 'Now test the checkin page at /secretary/events/4/checkin' as next_step;