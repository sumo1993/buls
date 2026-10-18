-- Enable public registration for ALL upcoming events
-- Run this in Supabase SQL Editor

UPDATE events
SET 
    allow_public_registration = true,
    require_guest_approval = false
WHERE event_date >= NOW();

-- Verify the changes
SELECT 
    id,
    title,
    event_date,
    event_type,
    allow_public_registration,
    require_guest_approval
FROM events
WHERE event_date >= NOW()
ORDER BY event_date;
