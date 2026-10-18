-- Check all prices for Prince and GCZ
-- 1. Check ticket_guests table (where ¥100 is stored)
SELECT 
    'ticket_guests' as source_table,
    tg.id,
    tg.full_name,
    tg.amount_paid,
    tg.payment_status,
    tg.ticket_purchase_id
FROM ticket_guests tg
WHERE tg.full_name IN ('Prince', 'GCZ')
ORDER BY tg.full_name;

-- 2. Check the ticket purchase (member's purchase)
SELECT 
    'ticket_purchases' as source_table,
    tp.id,
    tp.ticket_number,
    tp.unit_price,
    tp.total_price,
    tp.quantity,
    u.full_name as member_name
FROM ticket_purchases tp
JOIN users u ON tp.user_id = u.id
WHERE tp.id IN (
    SELECT ticket_purchase_id 
    FROM ticket_guests 
    WHERE full_name IN ('Prince', 'GCZ')
)
ORDER BY u.full_name;

-- 3. Check event_tickets table (the ticket type)
SELECT 
    'event_tickets' as source_table,
    et.id,
    et.name as ticket_name,
    et.price as ticket_price,
    e.title as event_title
FROM event_tickets et
JOIN events e ON et.event_id = e.id
WHERE et.id IN (
    SELECT tp.ticket_id
    FROM ticket_purchases tp
    WHERE tp.id IN (
        SELECT ticket_purchase_id 
        FROM ticket_guests 
        WHERE full_name IN ('Prince', 'GCZ')
    )
)
ORDER BY e.title;

-- 4. Check events table (door guest price)
SELECT 
    'events' as source_table,
    e.id,
    e.title,
    e.door_guest_price,
    e.max_total_guests_per_member
FROM events e
WHERE e.id IN (
    SELECT tp.event_id
    FROM ticket_purchases tp
    WHERE tp.id IN (
        SELECT ticket_purchase_id 
        FROM ticket_guests 
        WHERE full_name IN ('Prince', 'GCZ')
    )
)
ORDER BY e.title;
