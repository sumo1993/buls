-- Database Diagnostic Query
-- Run this in Supabase SQL Editor to understand current database structure

-- 1. Check users table structure
SELECT '=== USERS TABLE STRUCTURE ===' as info;
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. Check members_profile table structure
SELECT '=== MEMBERS_PROFILE TABLE STRUCTURE ===' as info;
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'members_profile'
ORDER BY ordinal_position;

-- 3. Check if foreign key relationship exists
SELECT '=== FOREIGN KEY RELATIONSHIPS ===' as info;
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('users', 'members_profile', 'event_registrations', 'ticket_purchases')
ORDER BY tc.table_name, kcu.column_name;

-- 4. Check sample data from members_profile
SELECT '=== SAMPLE MEMBERS_PROFILE DATA ===' as info;
SELECT 
  id,
  user_id,
  phone,
  passport_number,
  created_at
FROM members_profile 
LIMIT 5;

-- 5. Check event data for ID 4
SELECT '=== EVENT 4 DATA ===' as info;
SELECT 
  e.id,
  e.title,
  e.event_date,
  COUNT(er.id) as registrations_count,
  COUNT(tp.id) as ticket_purchases_count
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
LEFT JOIN ticket_purchases tp ON e.id = tp.event_id AND tp.payment_status = 'paid'
WHERE e.id = 4
GROUP BY e.id, e.title, e.event_date;

-- 6. Check current phone/passport data availability
SELECT '=== PHONE/PASSPORT DATA AVAILABILITY ===' as info;

-- Check users table
SELECT 
  'users' as table_name,
  COUNT(*) as total_rows,
  COUNT(phone_number) as rows_with_phone,
  COUNT(passport_number) as rows_with_passport
FROM users;

-- Check members_profile table  
SELECT 
  'members_profile' as table_name,
  COUNT(*) as total_rows,
  COUNT(phone) as rows_with_phone,
  COUNT(passport_number) as rows_with_passport
FROM members_profile;

-- 7. Recommendation based on findings
SELECT '=== RECOMMENDATION ===' as info;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members_profile' AND column_name = 'phone') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members_profile' AND column_name = 'passport_number')
    THEN 'Phone/passport data is in members_profile table. Update API to join with this table.'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_number')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'passport_number')
    THEN 'Phone/passport data is in users table. API is already correctly configured.'
    ELSE 'Phone/passport columns missing in both tables. Run migration to add to users table.'
  END as recommendation;

-- 8. Quick fix option (if members_profile has data but users doesn't)
SELECT '=== QUICK FIX OPTION ===' as info;
SELECT 'If members_profile has phone/passport data but users table doesn''t:' as suggestion;
SELECT '
UPDATE users u
SET 
  phone_number = mp.phone,
  passport_number = mp.passport_number
FROM members_profile mp
WHERE u.id = mp.user_id
  AND (u.phone_number IS NULL OR u.passport_number IS NULL)
  AND (mp.phone IS NOT NULL OR mp.passport_number IS NOT NULL);
' as sql_fix;