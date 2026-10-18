-- ============================================
-- 🔧 MANUAL USER CREATION FIX
-- ============================================
-- Run this in Supabase SQL Editor to create your user manually
-- This bypasses the webhook issue

-- Create your user manually
INSERT INTO users (clerk_id, full_name, email, role, status)
VALUES (
  'user_3JzqD7gykB5kYv0T80SP21qI8SF',  -- Your Clerk User ID (from logs)
  'Admin User',                        -- Your name
  '429318n@gmail.com',                 -- Your email
  'admin',                             -- Give admin role
  'active'                             -- Set to active
)
ON CONFLICT (clerk_id) 
DO UPDATE SET 
  full_name = 'Admin User',
  email = '429318n@gmail.com',
  role = 'admin',
  status = 'active',
  updated_at = NOW();

-- Verify the user was created
SELECT * FROM users WHERE clerk_id = 'user_3JzqD7gykB5kYv0T80SP21qI8SF';

-- Check all users
SELECT clerk_id, full_name, email, role, status, created_at 
FROM users 
ORDER BY created_at DESC;
