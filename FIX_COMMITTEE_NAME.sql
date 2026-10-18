-- Fix "Committee" name in users table
-- This SQL will help you find and fix users with "Committee" as their name

-- 1. First, find all users with "Committee" as full_name
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM users
WHERE full_name ILIKE '%committee%';

-- 2. Update a specific user's full_name (replace the email and actual name)
-- Example:
-- UPDATE users 
-- SET full_name = 'John Doe'
-- WHERE email = 'student@example.com';

-- 3. If you want to update multiple users, you can do it in batch:
-- UPDATE users 
-- SET full_name = 'NEEDS_UPDATE'
-- WHERE full_name ILIKE '%committee%';
