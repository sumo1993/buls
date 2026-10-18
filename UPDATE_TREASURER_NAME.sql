-- Update the treasurer's full name in the database
-- First, let's see current treasurer accounts
SELECT id, clerk_id, email, full_name, role 
FROM users 
WHERE role IN ('treasurer', 'admin');

-- Then update the treasurer's full_name
-- Replace 'NEW_TREASURER_NAME' with the actual treasurer's name
-- Replace 'CLERK_ID_HERE' with the treasurer's clerk_id (starts with user_)
UPDATE users 
SET full_name = 'NEW_TREASURER_NAME'
WHERE clerk_id = 'CLERK_ID_HERE' AND role IN ('treasurer', 'admin');

-- Verify the update
SELECT id, clerk_id, email, full_name, role 
FROM users 
WHERE role IN ('treasurer', 'admin');
