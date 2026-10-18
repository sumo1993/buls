-- ============================================
-- 👑 SETUP ADMIN USERS IN SUPABASE
-- ============================================
-- Run this in Supabase SQL Editor after creating users in Clerk
-- Replace the clerk_id values with your actual Clerk User IDs

-- Step 1: Create or Update Super Admin
INSERT INTO users (clerk_id, full_name, email, role, status)
VALUES (
  'user_SUPER_ADMIN_ID_HERE',  -- Replace with actual Clerk User ID
  'Super Admin',                -- Name
  'superadmin@bulsw.beijing',   -- Email
  'admin',                      -- Role
  'active'                      -- Status
)
ON CONFLICT (clerk_id) 
DO UPDATE SET 
  role = 'admin',
  status = 'active',
  updated_at = NOW();

-- Step 2: Create or Update Regular Admin
INSERT INTO users (clerk_id, full_name, email, role, status)
VALUES (
  'user_REGULAR_ADMIN_ID_HERE', -- Replace with actual Clerk User ID
  'Admin User',                  -- Name
  'admin@bulsw.beijing',         -- Email
  'admin',                      -- Role
  'active'                      -- Status
)
ON CONFLICT (clerk_id) 
DO UPDATE SET 
  role = 'admin',
  status = 'active',
  updated_at = NOW();

-- Step 3: Update your existing user to admin (optional)
-- Uncomment and replace with your actual clerk_id if needed
/*
UPDATE users 
SET role = 'admin', status = 'active'
WHERE clerk_id = 'user_3Jy5c43JevuyAHrr1W9VOtPqWpC';
*/

-- Step 4: Verify all admin users
SELECT clerk_id, full_name, email, role, status, created_at 
FROM users 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Step 5: Check total user count
SELECT COUNT(*) as total_users, 
       COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
       COUNT(CASE WHEN role = 'member' THEN 1 END) as member_count
FROM users;
