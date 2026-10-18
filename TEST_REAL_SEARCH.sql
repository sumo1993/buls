-- TEST WITH REAL PASSPORT/PHONE DATA
-- Use real passport numbers from members_profile

-- 1. Update test users with REAL passport numbers from members_profile
UPDATE users u
SET 
  passport_number = mp.passport_number
FROM members_profile mp
WHERE u.id = mp.user_id
  AND mp.passport_number IS NOT NULL
  AND u.passport_number IS NULL;

-- 2. Update test users with REAL phone numbers from members_profile
UPDATE users u
SET 
  phone_number = mp.phone
FROM members_profile mp
WHERE u.id = mp.user_id
  AND mp.phone IS NOT NULL
  AND u.phone_number IS NULL;

-- 3. Verify data was copied
SELECT '=== REAL DATA COPIED ===' as info;
SELECT 'Users with passport numbers:' as item, COUNT(*) as count FROM users WHERE passport_number IS NOT NULL
UNION ALL
SELECT 'Users with phone numbers:' as item, COUNT(*) as count FROM users WHERE phone_number IS NOT NULL;

-- 4. Show real passport numbers for testing
SELECT '=== REAL PASSPORT NUMBERS FOR TESTING ===' as info;
SELECT 
  u.full_name,
  u.passport_number,
  'Last 3 digits: ' || RIGHT(u.passport_number, 3) as last_3_digits
FROM users u
WHERE u.passport_number IS NOT NULL
  AND EXISTS (SELECT 1 FROM event_registrations er WHERE er.user_id = u.id AND er.event_id = 4)
LIMIT 5;

-- 5. Show real phone numbers for testing
SELECT '=== REAL PHONE NUMBERS FOR TESTING ===' as info;
SELECT 
  u.full_name,
  u.phone_number,
  'Last 3 digits: ' || RIGHT(REPLACE(u.phone_number, ' ', ''), 3) as last_3_digits
FROM users u
WHERE u.phone_number IS NOT NULL
  AND EXISTS (SELECT 1 FROM event_registrations er WHERE er.user_id = u.id AND er.event_id = 4)
LIMIT 5;

-- 6. Test search scenarios
SELECT '=== TEST SEARCH SCENARIOS ===' as info;
SELECT 'On checkin page, search for:' as instruction;
SELECT 
  'Full passport: ' || passport_number as search_term
FROM users 
WHERE passport_number IS NOT NULL 
LIMIT 3
UNION ALL
SELECT 
  'Last 3 digits of passport: ' || RIGHT(passport_number, 3) as search_term
FROM users 
WHERE passport_number IS NOT NULL 
LIMIT 3
UNION ALL
SELECT 
  'Full phone: ' || phone_number as search_term
FROM users 
WHERE phone_number IS NOT NULL 
LIMIT 2
UNION ALL
SELECT 
  'Last 3 digits of phone: ' || RIGHT(REPLACE(phone_number, ' ', ''), 3) as search_term
FROM users 
WHERE phone_number IS NOT NULL 
LIMIT 2;