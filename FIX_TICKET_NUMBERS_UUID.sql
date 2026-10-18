-- Since IDs are UUIDs, we need to generate sequential ticket numbers
-- Based on creation order

-- Add a sequence-based ticket number
WITH numbered_tickets AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as ticket_seq
  FROM ticket_purchases
  WHERE payment_status = 'paid'
)
UPDATE ticket_purchases tp
SET ticket_number = 'TKT' || LPAD(nt.ticket_seq::text, 10, '0')
FROM numbered_tickets nt
WHERE tp.id = nt.id;

-- Verify the results
SELECT 
  id,
  ticket_number,
  created_at,
  payment_status
FROM ticket_purchases 
WHERE payment_status = 'paid'
ORDER BY created_at
LIMIT 10;

-- This will create sequential tickets like:
-- TKT0000000001
-- TKT0000000002
-- TKT0000000003
-- etc.
