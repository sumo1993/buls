-- CHECK TICKET_PURCHASES TABLE STRUCTURE
-- Run this to see what columns are required

SELECT '=== TICKET_PURCHASES TABLE STRUCTURE ===' as info;
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'ticket_purchases'
ORDER BY ordinal_position;

-- Check constraints
SELECT '=== CONSTRAINTS ===' as info;
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'ticket_purchases'
ORDER BY tc.constraint_type, kcu.column_name;

-- Check sample data
SELECT '=== SAMPLE DATA ===' as info;
SELECT * FROM ticket_purchases LIMIT 3;