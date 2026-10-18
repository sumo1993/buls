-- ADD TEST DATA PROPERLY for Event 4 Checkin
-- Run this in Supabase SQL Editor

-- 1. First, check the ticket_purchases table structure
SELECT '=== TICKET_PURCHASES TABLE STRUCTURE ===' as info;
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'ticket_purchases'
ORDER BY ordinal_position;

-- 2. Check if event 4 exists
SELECT '=== CHECK EVENT 4 ===' as info;
SELECT id, title, event_date FROM events WHERE id = 4;

-- 3. Get some test users
SELECT '=== TEST USERS ===' as info;
SELECT id, full_name, email, role FROM users WHERE role IN ('member', 'secretary', 'treasurer') LIMIT 5;

-- 4. Add test registrations for event 4 (no ticket_id needed)
SELECT '=== ADDING TEST REGISTRATIONS ===' as info;
INSERT INTO event_registrations (event_id, user_id, status, registered_at)
SELECT 
  4,
  id,
  'registered',
  NOW() - INTERVAL '1 day'
FROM users 
WHERE role IN ('member', 'secretary', 'treasurer')
  AND id NOT IN (SELECT user_id FROM event_registrations WHERE event_id = 4)
LIMIT 3
ON CONFLICT DO NOTHING;

SELECT 'Added registrations:' as message;
SELECT COUNT(*) as count FROM event_registrations WHERE event_id = 4;

-- 5. Add test ticket purchases (properly handle ticket_id if required)
-- First check if we need ticket_id or if it's auto-generated
SELECT '=== ADDING TEST TICKET PURCHASES ===' as info;

-- Option A: If ticket_id is required and auto-generated, we need to handle it differently
DO $$
DECLARE
  test_user RECORD;
  ticket_id_val UUID;
BEGIN
  -- Get a test user
  SELECT id INTO test_user FROM users WHERE role IN ('member', 'secretary') LIMIT 1;
  
  IF test_user.id IS NOT NULL THEN
    -- Generate a ticket_id
    ticket_id_val := gen_random_uuid();
    
    -- Insert ticket purchase
    INSERT INTO ticket_purchases (
      event_id,
      user_id,
      ticket_id,
      ticket_number,
      quantity,
      total_price,
      payment_status,
      created_at
    ) VALUES (
      4,
      test_user.id,
      ticket_id_val,
      'TKT' || LPAD(CAST(EXTRACT(EPOCH FROM NOW()) AS TEXT), 10, '0'),
      1,
      50.00,
      'paid',
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Added ticket purchase for user %', test_user.id;
  ELSE
    RAISE NOTICE 'No test user found';
  END IF;
END $$;

-- 6. Update test users with phone/passport data
SELECT '=== UPDATING PHONE/PASSPORT DATA ===' as info;
UPDATE users 
SET 
  phone_number = CASE 
    WHEN id % 3 = 0 THEN '13545463782'
    WHEN id % 3 = 1 THEN '13912345678'
    WHEN id % 3 = 2 THEN '13898765432'
  END,
  passport_number = CASE
    WHEN id % 3 = 0 THEN 'PP0867644'
    WHEN id % 3 = 1 THEN 'PP0343445'
    WHEN id % 3 = 2 THEN 'PP0567575'
  END
WHERE phone_number IS NULL
  AND id IN (SELECT user_id FROM event_registrations WHERE event_id = 4)
LIMIT 5;

-- 7. Verify test data
SELECT '=== VERIFICATION ===' as info;

-- Check registrations
SELECT 'Event registrations:' as check;
SELECT COUNT(*) as count FROM event_registrations WHERE event_id = 4;

-- Check ticket purchases
SELECT 'Ticket purchases:' as check;
SELECT COUNT(*) as count FROM ticket_purchases WHERE event_id = 4 AND payment_status = 'paid';

-- Check users with phone numbers
SELECT 'Users with phone numbers for event 4:' as check;
SELECT COUNT(DISTINCT u.id) as count
FROM users u
JOIN event_registrations er ON u.id = er.user_id
WHERE er.event_id = 4
  AND u.phone_number IS NOT NULL;

-- Show sample data
SELECT '=== SAMPLE DATA ===' as info;
SELECT 
  u.full_name,
  u.email,
  u.phone_number,
  u.passport_number,
  er.status as registration_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM ticket_purchases tp WHERE tp.user_id = u.id AND tp.event_id = 4 AND tp.payment_status = 'paid')
    THEN 'Has paid ticket'
    ELSE 'No paid ticket'
  END as ticket_status
FROM users u
JOIN event_registrations er ON u.id = er.user_id
WHERE er.event_id = 4
LIMIT 5;