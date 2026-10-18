-- SIMPLE TEST DATA for Event 4 Checkin
-- Safe script that works with existing table structure

-- 1. Add test registrations (always works)
INSERT INTO event_registrations (event_id, user_id, status, registered_at)
SELECT 
  4,
  id,
  'registered',
  NOW()
FROM users 
WHERE role IN ('member', 'secretary', 'treasurer', 'admin')
  AND id NOT IN (SELECT user_id FROM event_registrations WHERE event_id = 4)
LIMIT 3
ON CONFLICT DO NOTHING;

-- 2. Update users with phone/passport for event 4
UPDATE users u
SET 
  phone_number = CASE 
    WHEN u.id % 3 = 0 THEN '13545463782'
    WHEN u.id % 3 = 1 THEN '13912345678'
    WHEN u.id % 3 = 2 THEN '13898765432'
  END,
  passport_number = CASE
    WHEN u.id % 3 = 0 THEN 'PP0867644'
    WHEN u.id % 3 = 1 THEN 'PP0343445'
    WHEN u.id % 3 = 2 THEN 'PP0567575'
  END
FROM event_registrations er
WHERE er.user_id = u.id
  AND er.event_id = 4
  AND u.phone_number IS NULL
LIMIT 5;

-- 3. Verify
SELECT '=== TEST DATA ADDED ===' as info;
SELECT 'Event 4 registrations:' as item, COUNT(*) as count FROM event_registrations WHERE event_id = 4
UNION ALL
SELECT 'Users with phone numbers:' as item, COUNT(DISTINCT u.id) as count
FROM users u
JOIN event_registrations er ON u.id = er.user_id
WHERE er.event_id = 4 AND u.phone_number IS NOT NULL
UNION ALL
SELECT 'Sample user with phone 13545463782:' as item, 
  CASE WHEN EXISTS (
    SELECT 1 FROM users u
    JOIN event_registrations er ON u.id = er.user_id
    WHERE er.event_id = 4 AND u.phone_number = '13545463782'
  ) THEN 1 ELSE 0 END as count;

-- 4. Show what we have
SELECT '=== SAMPLE ATTENDEES ===' as info;
SELECT 
  u.full_name,
  u.email,
  u.phone_number,
  u.passport_number,
  er.registered_at
FROM users u
JOIN event_registrations er ON u.id = er.user_id
WHERE er.event_id = 4
  AND u.phone_number IS NOT NULL
LIMIT 5;