-- Get the treasurer's actual information from the database
-- This will show us what data we have about the treasurer

SELECT 
  id,
  clerk_id,
  full_name,
  email,
  role,
  status,
  created_at,
  updated_at
FROM users
WHERE id = '6f5445e8-88f3-40b1-95f0-33860e23a053'
   OR clerk_id = 'user_3K624DNQSDzwNaAIPHpqkYYMiiY'
   OR role = 'treasurer';

-- Also check if there are any other admin/treasurer users
SELECT 
  id,
  clerk_id,
  full_name,
  email,
  role,
  status
FROM users
WHERE role IN ('admin', 'treasurer', 'finance', 'secretary')
ORDER BY role, full_name;
