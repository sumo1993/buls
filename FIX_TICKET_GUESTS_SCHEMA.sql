-- FIX TICKET GUESTS SCHEMA
-- Converts ticket_guests from BIGSERIAL to UUID to match ticket_purchases

-- 1. Drop existing foreign key constraint
ALTER TABLE ticket_guests 
DROP CONSTRAINT IF EXISTS ticket_guests_ticket_purchase_id_fkey;

-- 2. Change ticket_purchase_id from BIGINT to UUID
ALTER TABLE ticket_guests 
ALTER COLUMN ticket_purchase_id TYPE UUID 
USING ticket_purchase_id::UUID;

-- 3. Recreate foreign key constraint
ALTER TABLE ticket_guests 
ADD CONSTRAINT ticket_guests_ticket_purchase_id_fkey 
FOREIGN KEY (ticket_purchase_id) 
REFERENCES ticket_purchases(id) 
ON DELETE CASCADE;

-- 4. Also change checked_in_by from BIGINT to UUID if exists
ALTER TABLE ticket_guests 
DROP CONSTRAINT IF EXISTS ticket_guests_checked_in_by_fkey;

ALTER TABLE ticket_guests 
ALTER COLUMN checked_in_by TYPE UUID 
USING checked_in_by::UUID;

ALTER TABLE ticket_guests 
ADD CONSTRAINT ticket_guests_checked_in_by_fkey 
FOREIGN KEY (checked_in_by) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- 5. Verify the changes
SELECT '=== VERIFICATION ===' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ticket_guests' 
AND column_name IN ('id', 'ticket_purchase_id', 'checked_in_by')
ORDER BY column_name;

SELECT '=== SCHEMA FIX COMPLETE ===' as message;
SELECT 'ticket_guests table now uses UUID for ticket_purchase_id' as message;
