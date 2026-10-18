-- Check if purchased_by_user_id column exists and has proper foreign key
SELECT 
    c.column_name,
    c.data_type,
    c.is_nullable,
    tc.constraint_name,
    tc.constraint_type,
    kcu.table_name as foreign_table,
    kcu.column_name as foreign_column
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu 
    ON c.table_name = kcu.table_name 
    AND c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc 
    ON kcu.constraint_name = tc.constraint_name
WHERE c.table_name = 'ticket_purchases' 
    AND c.column_name = 'purchased_by_user_id';

-- Also check all foreign keys on ticket_purchases table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'ticket_purchases' 
    AND tc.constraint_type = 'FOREIGN KEY';
