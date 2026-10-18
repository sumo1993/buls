-- Create Admin User Manually
-- Run this in Supabase SQL Editor

-- Replace these values with your actual Clerk user info:
-- YOUR_CLERK_USER_ID: Get from Clerk Dashboard → Users → Click your user → Copy "User ID"
-- YOUR_FULL_NAME: Your name
-- YOUR_EMAIL: Your email

INSERT INTO users (clerk_id, full_name, email, role, status)
VALUES (
  'YOUR_CLERK_USER_ID',  -- Replace with your actual Clerk User ID
  'YOUR_FULL_NAME',      -- Replace with your name
  'YOUR_EMAIL',          -- Replace with your email
  'admin',               -- Admin role
  'active'               -- Active status
)
ON CONFLICT (clerk_id) 
DO UPDATE SET 
  role = 'admin',
  status = 'active';

-- Verify it was created
SELECT * FROM users WHERE role = 'admin';
