-- Fix treasurer's name from "Unknown User" to actual name
-- First, let's check what the treasurer's current data looks like

SELECT 
  id,
  clerk_id,
  full_name,
  email,
  role,
  status,
  created_at
FROM users
WHERE role = 'treasurer'
   OR id = '6f5445e8-88f3-40b1-95f0-33860e23a053';

-- If the treasurer's name is "Unknown User" or NULL, update it:
-- Replace 'John Doe' with the actual treasurer's name

UPDATE users
SET full_name = 'Treasurer Name'  -- ← CHANGE THIS TO THE ACTUAL NAME
WHERE id = '6f5445e8-88f3-40b1-95f0-33860e23a053'
  AND (full_name IS NULL OR full_name = 'Unknown User' OR full_name = '');

-- Verify the update
SELECT 
  id,
  clerk_id,
  full_name,
  email,
  role
FROM users
WHERE id = '6f5445e8-88f3-40b1-95f0-33860e23a053';
