-- Update existing non_member_registrations to have the correct amount_paid
-- This updates records that have amount_paid = 0 or NULL with the event's non_member_price

UPDATE non_member_registrations nmr
SET amount_paid = COALESCE(e.non_member_price, 0)
FROM events e
WHERE nmr.event_id = e.id
AND (nmr.amount_paid IS NULL OR nmr.amount_paid = 0);

-- Verify the update
SELECT 
  nmr.id,
  nmr.full_name,
  e.title as event_title,
  nmr.amount_paid,
  e.non_member_price
FROM non_member_registrations nmr
LEFT JOIN events e ON nmr.event_id = e.id
ORDER BY nmr.registered_at DESC
LIMIT 20;
