-- Find and fix stale ticket_purchases.unit_price that don't match event_tickets.price
-- (e.g. purchase snapped ¥100, catalog later set to ¥10)

-- 1) Inspect mismatches
SELECT
  tp.id AS purchase_id,
  e.title AS event_title,
  u.full_name AS member_name,
  tp.unit_price AS stored_unit_price,
  tp.total_price AS stored_total_price,
  tp.quantity,
  et.price AS catalog_price,
  et.name AS ticket_name
FROM ticket_purchases tp
JOIN event_tickets et ON et.id = tp.ticket_id
JOIN events e ON e.id = tp.event_id
LEFT JOIN users u ON u.id = tp.user_id
WHERE tp.unit_price IS DISTINCT FROM et.price
ORDER BY e.id, tp.created_at;

-- 2) Sync purchase snapshot to current catalog price
UPDATE ticket_purchases tp
SET
  unit_price = et.price,
  total_price = et.price * COALESCE(tp.quantity, 1)
FROM event_tickets et
WHERE et.id = tp.ticket_id
  AND tp.unit_price IS DISTINCT FROM et.price;

-- 3) Optional: align non-refunded guest amount_paid to catalog when it matches old unit price
-- Review results of step 1 before running this.
-- UPDATE ticket_guests tg
-- SET amount_paid = et.price
-- FROM ticket_purchases tp
-- JOIN event_tickets et ON et.id = tp.ticket_id
-- WHERE tg.ticket_purchase_id = tp.id
--   AND tg.payment_status IS DISTINCT FROM 'refunded'
--   AND tg.amount_paid IS DISTINCT FROM et.price
--   AND tg.amount_paid = tp.unit_price; -- only if you run BEFORE step 2

-- Verify
SELECT
  tp.id,
  u.full_name,
  tp.unit_price,
  tp.total_price,
  et.price AS catalog_price
FROM ticket_purchases tp
JOIN event_tickets et ON et.id = tp.ticket_id
LEFT JOIN users u ON u.id = tp.user_id
WHERE tp.event_id = 4;
