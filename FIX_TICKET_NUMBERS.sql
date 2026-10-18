-- Step 1: Add ticket_number column to ticket_purchases table
ALTER TABLE ticket_purchases 
ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(20);

-- Step 2: Generate ticket numbers for all existing paid tickets
UPDATE ticket_purchases
SET ticket_number = 'TKT' || LPAD(
  SUBSTRING(REGEXP_REPLACE(id::text, '[^0-9]', '', 'g'), 1, 10),
  10,
  '0'
)
WHERE payment_status = 'paid' AND ticket_number IS NULL;

-- Step 3: Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_ticket_number 
ON ticket_purchases(ticket_number);

-- Step 4: Verify the results
SELECT 
  id,
  ticket_number,
  payment_status,
  LENGTH(ticket_number) as ticket_length,
  created_at
FROM ticket_purchases 
WHERE payment_status = 'paid'
ORDER BY created_at DESC
LIMIT 20;
