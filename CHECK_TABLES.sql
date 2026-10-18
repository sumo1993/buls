-- CHECK WHAT TABLES EXIST
-- Run this first to see the current database structure

SELECT '=== ALL TABLES IN DATABASE ===' as info;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT '=== EVENT_REGISTRATIONS TABLE STRUCTURE ===' as info;
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'event_registrations'
ORDER BY ordinal_position;

SELECT '=== USERS TABLE STRUCTURE ===' as info;
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

SELECT '=== TICKET_PURCHASES TABLE STRUCTURE ===' as info;
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'ticket_purchases'
ORDER BY ordinal_position;

SELECT '=== MEMBERS_PROFILE TABLE STRUCTURE ===' as info;
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'members_profile'
ORDER BY ordinal_position;

-- Check if event_registrations table has status column
SELECT '=== CHECK EVENT_REGISTRATIONS STATUS COLUMN ===' as info;
SELECT EXISTS(
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'event_registrations' AND column_name = 'status'
) as has_status_column;