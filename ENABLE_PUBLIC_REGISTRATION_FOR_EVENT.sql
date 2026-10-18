-- Enable public registration for a specific event
-- Replace 'YOUR_EVENT_ID' with actual event ID from events table

-- Option 1: Enable for a specific event by ID
UPDATE events
SET allow_public_registration = true,
    require_guest_approval = false  -- Set to true if you want to manually approve registrations
WHERE id = 'YOUR_EVENT_ID';

-- Option 2: Enable for ALL upcoming events
UPDATE events
SET allow_public_registration = true,
    require_guest_approval = false
WHERE event_date >= NOW();

-- Option 3: Check which events exist and their current settings
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

-- Example: Enable for an event by title
UPDATE events
SET allow_public_registration = true,
    require_guest_approval = false
WHERE title ILIKE '%your event name%'
AND event_date >= NOW();
