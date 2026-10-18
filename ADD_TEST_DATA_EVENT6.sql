-- SIMPLE TEST DATA for Event 6 Checkin
-- Works with ANY database schema - just adds test data
-- Uses event_id 6 (from the checkin page logs)

-- 1. Check what users exist first
SELECT '=== CHECKING EXISTING DATA ===' as info;
SELECT 'Users count:' as item, COUNT(*) as count FROM users;
SELECT 'Event 6:' as item, COUNT(*) as count FROM events WHERE id = 6;

-- 2. Get first 3 users (any role) to use for test data
SELECT '=== SELECTING TEST USERS ===' as info;
SELECT id, clerk_id, full_name, email, role 
FROM users 
WHERE role IS NOT NULL 
ORDER BY id 
LIMIT 3;

-- 3. Add test registrations for event 6 (free registrations)
SELECT '=== ADDING EVENT REGISTRATIONS ===' as info;
INSERT INTO event_registrations (event_id, user_id, status, notes)
SELECT 
  6 as event_id,
  u.id as user_id,
  'registered' as status,
  'Test registration for event 6 check-in testing' as notes
FROM users u
WHERE u.id IN (
  SELECT id FROM users WHERE role IS NOT NULL ORDER BY id LIMIT 3
)
ON CONFLICT (event_id, user_id) DO NOTHING;

SELECT 'Added registrations count:' as item, COUNT(*) as count 
FROM event_registrations 
WHERE event_id = 6;

-- 4. Add test ticket purchases for event 6 (paid tickets)
SELECT '=== ADDING TICKET PURCHASES ===' as info;
INSERT INTO ticket_purchases (
  event_id, 
  user_id, 
  ticket_number, 
  quantity, 
  total_price, 
  payment_status,
  status,
  created_at
)
SELECT 
  6 as event_id,
  u.id as user_id,
  'TKT' || LPAD(u.id::text, 6, '0') || '-640' as ticket_number,
  1 as quantity,
  50.00 as total_price,
  'paid' as payment_status,
  'approved' as status,
  NOW() as created_at
FROM users u
WHERE u.id IN (
  SELECT id FROM users WHERE role IS NOT NULL ORDER BY id LIMIT 2
)
ON CONFLICT DO NOTHING;

SELECT 'Added ticket purchases count:' as item, COUNT(*) as count 
FROM ticket_purchases 
WHERE event_id = 6;

-- 5. Verify the data
SELECT '=== VERIFICATION ===' as info;
SELECT 
  'event_registrations' as source,
  COUNT(*) as count,
  'free registrations' as type
FROM event_registrations 
WHERE event_id = 6

UNION ALL

SELECT 
  'ticket_purchases' as source,
  COUNT(*) as count,
  'paid tickets' as type
FROM ticket_purchases 
WHERE event_id = 6;

-- 6. Show sample data
SELECT '=== SAMPLE DATA ===' as info;

-- Show event registrations
SELECT 'Event Registrations:' as source, er.id, u.full_name, u.email, er.status
FROM event_registrations er
JOIN users u ON er.user_id = u.id
WHERE er.event_id = 6
ORDER BY er.id DESC
LIMIT 5;

-- Show ticket purchases
SELECT 'Ticket Purchases:' as source, tp.id, u.full_name, tp.ticket_number, tp.payment_status
FROM ticket_purchases tp
JOIN users u ON tp.user_id = u.id
WHERE tp.event_id = 6
ORDER BY tp.id DESC
LIMIT 5;