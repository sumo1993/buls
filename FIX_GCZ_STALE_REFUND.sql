-- Correct GCZ (and similar guests) charged/refunded ¥100 when ticket catalog is ¥10

-- 1) Inspect
SELECT
  tg.id,
  tg.full_name,
  tg.amount_paid,
  tg.refund_amount,
  tg.payment_status,
  tp.unit_price AS purchase_unit_price,
  et.price AS catalog_price,
  e.title
FROM ticket_guests tg
JOIN ticket_purchases tp ON tp.id = tg.ticket_purchase_id
JOIN event_tickets et ON et.id = tp.ticket_id
JOIN events e ON e.id = tp.event_id
WHERE tg.full_name ILIKE '%GCZ%'
   OR (tg.amount_paid IS DISTINCT FROM et.price AND tg.amount_paid > 0)
   OR (tg.refund_amount IS DISTINCT FROM et.price AND tg.refund_amount > 0);

-- 2) Fix refunded / paid guest amounts to match catalog ticket price
UPDATE ticket_guests tg
SET
  amount_paid = et.price,
  refund_amount = CASE
    WHEN tg.payment_status = 'refunded' THEN et.price
    ELSE tg.refund_amount
  END
FROM ticket_purchases tp
JOIN event_tickets et ON et.id = tp.ticket_id
WHERE tg.ticket_purchase_id = tp.id
  AND et.price > 0
  AND (
    tg.amount_paid IS DISTINCT FROM et.price
    OR (tg.payment_status = 'refunded' AND tg.refund_amount IS DISTINCT FROM et.price)
  );

-- 3) Also sync purchase snapshots (member ticket)
UPDATE ticket_purchases tp
SET
  unit_price = et.price,
  total_price = et.price * COALESCE(tp.quantity, 1)
FROM event_tickets et
WHERE et.id = tp.ticket_id
  AND tp.unit_price IS DISTINCT FROM et.price;

-- Verify GCZ
SELECT tg.full_name, tg.amount_paid, tg.refund_amount, tg.payment_status, et.price AS catalog
FROM ticket_guests tg
JOIN ticket_purchases tp ON tp.id = tg.ticket_purchase_id
JOIN event_tickets et ON et.id = tp.ticket_id
WHERE tg.full_name ILIKE '%GCZ%';
