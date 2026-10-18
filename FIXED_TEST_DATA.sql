-- FIXED TEST DATA for Event 4 Checkin
-- PostgreSQL-compatible syntax

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

-- 2. Update users with phone/passport for event 4 (using CTE to limit)
WITH users_to_update AS (
  SELECT u.id
  FROM users u
  JOIN event_registrations er ON u.id = er.user_id
  WHERE er.event_id = 4
    AND u.phone_number IS NULL
  LIMIT 5
)
UPDATE users u
SET 
  phone_number = CASE 
    WHEN u.id % 3 = 0 THEN '7054636640'
    WHEN u.id % 3 = 1 THEN '7054636641'
    WHEN u.id % 3 = 2 THEN '7054636642'
  END,
  passport_number = CASE
    WHEN u.id % 3 = 0 THEN 'AB123456'
    WHEN u.id % 3 = 1 THEN 'CD789012'
    WHEN u.id % 3 = 2 THEN 'EF345678'
  END
FROM users_to_update utu
WHERE u.id = utu.id;

-- 3. Verify
SELECT '=== TEST DATA ADDED ===' as info;
SELECT 'Event 4 registrations:' as item, COUNT(*) as count FROM event_registrations WHERE event_id = 4
UNION ALL
SELECT 'Users with phone numbers:' as item, COUNT(DISTINCT u.id) as count
FROM users u
JOIN event_registrations er ON u.id = er.user_id
WHERE er.event_id = 4 AND u.phone_number IS NOT NULL
UNION ALL
SELECT 'Sample user with phone 7054636640:' as item, 
  CASE WHEN EXISTS (
    SELECT 1 FROM users u
    JOIN event_registrations er ON u.id = er.user_id
    WHERE er.event_id = 4 AND u.phone_number = '7054636640'
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