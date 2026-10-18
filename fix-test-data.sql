-- Fixed test data script - checks actual user roles first
-- This will work with your actual database schema

-- 1. First check what user roles exist
SELECT '=== Checking user roles ===' as info;
SELECT DISTINCT role FROM users ORDER BY role;

-- 2. Check what events exist
SELECT '=== Checking events ===' as info;
SELECT id, title FROM events ORDER BY id;

-- 3. Add test registrations using actual roles
SELECT '=== Adding test registrations ===' as info;

-- Get the first event ID
DO $$
DECLARE
  target_event_id integer;
  valid_role text;
BEGIN
  -- Get first event ID
  SELECT id INTO target_event_id FROM events ORDER BY id LIMIT 1;
  
  -- Get a valid user role
  SELECT role INTO valid_role FROM users WHERE role IS NOT NULL LIMIT 1;
  
  RAISE NOTICE 'Using event ID: %, Valid role: %', target_event_id, valid_role;
  
  -- Add test registrations
  INSERT INTO event_registrations (event_id, user_id, status, notes)
  SELECT 
    target_event_id as event_id,
    u.id as user_id,
    'confirmed' as status,
    'Test registration for checkin testing' as notes
  FROM users u
  WHERE u.role = valid_role
  LIMIT 3
  ON CONFLICT (event_id, user_id) DO NOTHING;
  
  RAISE NOTICE 'Added test registrations for event %', target_event_id;
END $$;

-- 4. Add test ticket purchases
SELECT '=== Adding test ticket purchases ===' as info;

DO $$
DECLARE
  target_event_id integer;
  valid_role text;
BEGIN
  -- Get first event ID (same as above)
  SELECT id INTO target_event_id FROM events ORDER BY id LIMIT 1;
  
  -- Get a valid user role
  SELECT role INTO valid_role FROM users WHERE role IS NOT NULL LIMIT 1;
  
  -- Add test ticket purchases
  INSERT INTO ticket_purchases (event_id, user_id, ticket_number, quantity, total_price, payment_status)
  SELECT 
    target_event_id as event_id,
    u.id as user_id,
    -- Generate simple ticket numbers
    'TKT-' || LPAD(u.id::text, 6, '0') || '-TEST' as ticket_number,
    1 as quantity,
    50.00 as total_price,
    'paid' as payment_status
  FROM users u
  WHERE u.role = valid_role
  LIMIT 2
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Added test ticket purchases for event %', target_event_id;
END $$;

-- 5. Verify the data was added
SELECT '=== Verification ===' as info;

SELECT 
  'event_registrations' as source,
  COUNT(*) as count
FROM event_registrations
UNION ALL
SELECT 
  'ticket_purchases' as source,
  COUNT(*) as count
FROM ticket_purchases;

-- Show what was added
SELECT 'Event Registrations:' as info;
SELECT er.id, er.event_id, u.full_name, u.email, er.status
FROM event_registrations er
JOIN users u ON er.user_id = u.id
ORDER BY er.id DESC
LIMIT 5;

SELECT 'Ticket Purchases:' as info;
SELECT tp.id, tp.event_id, u.full_name, tp.ticket_number, tp.payment_status
FROM ticket_purchases tp
JOIN users u ON tp.user_id = u.id
ORDER BY tp.id DESC
LIMIT 5;