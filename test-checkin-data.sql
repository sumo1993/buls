-- Test SQL for Checkin Page Debugging
-- Run this in Supabase SQL Editor

-- 1. Check if event 4 exists
SELECT '=== Checking Event 4 ===' as test;
SELECT id, title, event_date, status FROM events WHERE id = 4;

-- 2. Check registrations for event 4
SELECT '=== Event Registrations ===' as test;
SELECT 
  er.id,
  er.event_id,
  er.user_id,
  er.status,
  er.registered_at,
  u.full_name,
  u.email,
  u.role
FROM event_registrations er
LEFT JOIN users u ON er.user_id = u.id
WHERE er.event_id = 4;

-- 3. Check ticket purchases for event 4
SELECT '=== Ticket Purchases ===' as test;
SELECT 
  tp.id,
  tp.event_id,
  tp.user_id,
  tp.ticket_number,
  tp.payment_status,
  tp.quantity,
  tp.total_price,
  u.full_name,
  u.email,
  u.role
FROM ticket_purchases tp
LEFT JOIN users u ON tp.user_id = u.id
WHERE tp.event_id = 4
AND tp.payment_status IN ('paid', 'pending');

-- 4. Check checkins for event 4
SELECT '=== Existing Checkins ===' as test;
SELECT 
  ec.id,
  ec.event_id,
  ec.user_id,
  ec.check_in_method,
  ec.checked_in_at,
  u.full_name,
  u.email
FROM event_checkins ec
LEFT JOIN users u ON ec.user_id = u.id
WHERE ec.event_id = 4;

-- 5. Check users table for Clerk sync issues
SELECT '=== Sample Users (check if clerk_id exists) ===' as test;
SELECT id, clerk_id, full_name, email, role, status FROM users LIMIT 5;

-- 6. Quick test data if none exists
SELECT '=== Quick Test Data (optional) ===' as test;
SELECT 'Run this if no data exists:' as instruction;
SELECT '
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Create test user if not exists
  INSERT INTO users (clerk_id, email, full_name, role, status) 
  VALUES (''test_checkin_user'', ''test@checkin.com'', ''Test Checkin User'', ''secretary'', ''active'')
  ON CONFLICT (clerk_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name
  RETURNING id INTO test_user_id;
  
  -- Add registration for event 4
  INSERT INTO event_registrations (event_id, user_id, status)
  VALUES (4, test_user_id, ''registered'')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE ''Test user created with ID: %'', test_user_id;
END $$;
' as sql_code;