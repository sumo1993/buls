-- CHECK ACTUAL PHONE/PASSPORT FORMATS
-- Run this to see what real data looks like

-- 1. Check members_profile table for actual phone/passport data
SELECT '=== MEMBERS_PROFILE DATA ===' as info;
SELECT 
  id,
  user_id,
  phone,
  passport_number,
  created_at
FROM members_profile 
WHERE (phone IS NOT NULL OR passport_number IS NOT NULL)
LIMIT 10;

-- 2. Check users table for phone/passport data (if any)
SELECT '=== USERS TABLE DATA ===' as info;
SELECT 
  id,
  full_name,
  email,
  phone_number,
  passport_number
FROM users 
WHERE (phone_number IS NOT NULL OR passport_number IS NOT NULL)
LIMIT 10;

-- 3. Check event 4 registrations with member profile data
SELECT '=== EVENT 4 ATTENDEES WITH PROFILE DATA ===' as info;
SELECT 
  u.id as user_id,
  u.full_name,
  u.email,
  u.phone_number as users_phone,
  u.passport_number as users_passport,
  mp.phone as members_profile_phone,
  mp.passport_number as members_profile_passport,
  er.registered_at
FROM event_registrations er
JOIN users u ON er.user_id = u.id
LEFT JOIN members_profile mp ON u.id = mp.user_id
WHERE er.event_id = 4
ORDER BY er.registered_at DESC
LIMIT 10;

-- 4. Sample of what phone numbers look like
SELECT '=== PHONE NUMBER FORMATS ===' as info;
SELECT 
  phone,
  LENGTH(phone) as length,
  LEFT(phone, 3) as prefix,
  CASE 
    WHEN phone LIKE '+%' THEN 'International format'
    WHEN phone LIKE '1%' THEN 'US/China mobile?'
    WHEN phone LIKE '0%' THEN 'Local format'
    ELSE 'Other format'
  END as format_type
FROM members_profile 
WHERE phone IS NOT NULL
LIMIT 5;

-- 5. Sample of what passport numbers look like
SELECT '=== PASSPORT NUMBER FORMATS ===' as info;
SELECT 
  passport_number,
  LENGTH(passport_number) as length,
  LEFT(passport_number, 2) as prefix,
  CASE 
    WHEN passport_number ~ '^[A-Z]{2}[0-9]{7}$' THEN 'Standard format (2 letters + 7 digits)'
    WHEN passport_number ~ '^[A-Z]{1}[0-9]{8}$' THEN 'Alternative format (1 letter + 8 digits)'
    WHEN passport_number ~ '^[0-9]{9}$' THEN 'Numeric only'
    ELSE 'Other format'
  END as format_type
FROM members_profile 
WHERE passport_number IS NOT NULL
LIMIT 5;