-- Check user ID mismatch between loans and payments
-- Run this in Supabase SQL Editor

-- 1. Check the loan applicant's user_id
SELECT 
  l.id as loan_id,
  l.user_id as loan_user_id,
  u.full_name,
  u.email,
  u.clerk_id
FROM loans l
LEFT JOIN users u ON l.user_id = u.id
WHERE l.id = '2ea425ee-f40a-4a4e-a3dd-732183dff4ec';

-- 2. Check payments for user with email committee+clerk_test@example.com
SELECT 
  p.id as payment_id,
  p.user_id as payment_user_id,
  p.month,
  p.year,
  p.status,
  u.full_name,
  u.email
FROM payments p
LEFT JOIN users u ON p.user_id = u.id
WHERE u.email = 'committee+clerk_test@example.com'
  AND p.year = 2026
ORDER BY p.created_at DESC;

-- 3. Check if there's a user_id mismatch
SELECT 
  'LOAN USER_ID' as source,
  l.user_id,
  u.full_name,
  u.email
FROM loans l
LEFT JOIN users u ON l.user_id = u.id
WHERE l.id = '2ea425ee-f40a-4a4e-a3dd-732183dff4ec'

UNION ALL

SELECT 
  'PAYMENT USER_ID' as source,
  p.user_id,
  u.full_name,
  u.email
FROM payments p
LEFT JOIN users u ON p.user_id = u.id
WHERE u.email = 'committee+clerk_test@example.com'
  AND p.year = 2026
LIMIT 1;

-- 4. Find the correct user_id for committee email
SELECT 
  id as user_id,
  clerk_id,
  full_name,
  email,
  role
FROM users
WHERE email = 'committee+clerk_test@example.com'
   OR full_name = 'Committee';

-- 5. Check all payments regardless of user_id match
SELECT 
  p.id,
  p.user_id,
  p.month,
  p.year,
  p.status,
  p.amount,
  u.full_name,
  u.email
FROM payments p
LEFT JOIN users u ON p.user_id = u.id
WHERE p.year = 2026
  AND p.status IN ('approved', 'collected')
ORDER BY u.full_name, p.created_at;
