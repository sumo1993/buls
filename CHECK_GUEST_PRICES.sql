-- Check actual guest payment amounts
SELECT 
    tg.id,
    tg.full_name as guest_name,
    tg.amount_paid as guest_amount,
    tg.payment_status,
    tg.payment_method,
    tg.payment_notes,
    tp.ticket_number,
    tp.total_price as member_ticket_price,
    u.full_name as member_name,
    et.name as ticket_type,
    et.price as ticket_unit_price,
    e.title as event_title
FROM ticket_guests tg
JOIN ticket_purchases tp ON tg.ticket_purchase_id = tp.id
JOIN users u ON tp.user_id = u.id
JOIN event_tickets et ON tp.ticket_id = et.id
JOIN events e ON tp.event_id = e.id
WHERE tg.id IN ('67c65384-0ab2-447d-92cb-93bc36256ca3', 'af4a240d-3d31-46bd-bed3-18ee611edb3d')
ORDER BY tg.full_name;
