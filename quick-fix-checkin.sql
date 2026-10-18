-- Quick Fix for /secretary/events/4/checkin
-- Run this in Supabase SQL Editor

-- 1. First, check if event 4 exists
SELECT 'Checking Event 4...' as step;
SELECT id, title, event_date FROM events WHERE id = 4;

-- If event 4 doesn't exist, use the first event
DO $$
DECLARE
  target_event_id INTEGER;
BEGIN
  -- Try to get event 4
  SELECT id INTO target_event_id FROM events WHERE id = 4;
  
  -- If event 4 doesn't exist, get the first event
  IF target_event_id IS NULL THEN
    SELECT id INTO target_event_id FROM events ORDER BY id LIMIT 1;
    RAISE NOTICE 'Event 4 not found. Using event ID: % instead', target_event_id;
  ELSE
    RAISE NOTICE 'Found event 4';
  END IF;
  
  -- Store for use
  DROP TABLE IF EXISTS fix_target_event;
  CREATE TEMP TABLE fix_target_event (event_id INTEGER);
  INSERT INTO fix_target_event (event_id) VALUES (target_event_id);
END $$;

-- Show which event we're targeting
SELECT 'Target Event ID:' as label, event_id FROM fix_target_event;

-- 2. Add a test secretary user if needed
SELECT 'Adding test secretary user...' as step;
DO $$
BEGIN
  -- Check if a secretary user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'secretary' LIMIT 1) THEN
    -- Create a test secretary user
    INSERT INTO users (clerk_id, email, full_name, role, status)
    VALUES ('test_secretary_fix', 'secretary@test.com', 'Test Secretary', 'secretary', 'active');
    RAISE NOTICE 'Created test secretary user';
  ELSE
    RAISE NOTICE 'Secretary user already exists';
  END IF;
END $$;

-- 3. Add test data for the target event
SELECT 'Adding test checkin data...' as step;

DO $$
DECLARE
  e_id INTEGER;
  test_user_id UUID;
BEGIN
  -- Get event ID
  SELECT event_id INTO e_id FROM fix_target_event;
  
  -- Get or create test user
  INSERT INTO users (clerk_id, email, full_name, role, status)
  VALUES ('test_checkin_fix', 'test@checkinfix.com', 'Test User for Checkin', 'member', 'active')
  ON CONFLICT (clerk_id) DO UPDATE SET
    email = EXCLUDED.email
  RETURNING id INTO test_user_id;
  
  -- Add registration
  INSERT INTO event_registrations (event_id, user_id, status, notes)
  VALUES (e_id, test_user_id, 'registered', 'Test data for checkin page fix')
  ON CONFLICT DO NOTHING;
  
  -- Add ticket purchase (searchable by "640")
  INSERT INTO ticket_purchases (event_id, user_id, ticket_number, quantity, total_price, payment_status)
  VALUES (e_id, test_user_id, 'TKT0000000640', 1, 50.00, 'paid')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Added test data for event %', e_id;
END $$;

-- 4. Show what was added
SELECT 'Final Check:' as step;

SELECT 
  'Registration' as type,
  er.id,
  u.full_name,
  u.email
FROM event_registrations er
JOIN users u ON er.user_id = u.id
WHERE er.event_id = (SELECT event_id FROM fix_target_event)
AND u.clerk_id = 'test_checkin_fix'

UNION ALL

SELECT 
  'Ticket Purchase' as type,
  tp.id,
  u.full_name,
  u.email
FROM ticket_purchases tp
JOIN users u ON tp.user_id = u.id
WHERE tp.event_id = (SELECT event_id FROM fix_target_event)
AND u.clerk_id = 'test_checkin_fix'

ORDER BY type;

-- 5. Clean up
DROP TABLE IF EXISTS fix_target_event;

SELECT '=== FIX COMPLETE ===' as step;
SELECT '1. Go to: /secretary/events/[event_id]/checkin' as instruction;
SELECT '2. Replace [event_id] with: ' || (SELECT id FROM events WHERE id = 4 OR id = (SELECT id FROM events ORDER BY id LIMIT 1)) as instruction;
SELECT '3. Sign in with a user that has secretary or admin role' as instruction;
SELECT '4. Search for "640" to find the test ticket' as instruction;