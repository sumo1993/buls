-- ============================================
-- ⚡ QUICK ADMIN SETUP (Use existing user)
-- ============================================
-- This makes your existing user an admin immediately
-- Run this in Supabase SQL Editor

-- Make your existing user an admin
UPDATE users 
SET role = 'admin', status = 'active'
WHERE clerk_id = 'user_3Jy5c43JevuyAHrr1W9VOtPqWpC';

-- Verify the change
SELECT clerk_id, full_name, email, role, status 
FROM users 
WHERE clerk_id = 'user_3Jy5c43JevuyAHrr1W9VOtPqWpC';
