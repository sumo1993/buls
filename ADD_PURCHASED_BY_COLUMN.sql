-- Add purchased_by_user_id column and foreign key to ticket_purchases
-- This tracks who actually purchased the ticket (treasurer vs self-purchase)

DO $$
BEGIN
  -- Add purchased_by_user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ticket_purchases' 
    AND column_name = 'purchased_by_user_id'
  ) THEN
    ALTER TABLE ticket_purchases 
    ADD COLUMN purchased_by_user_id UUID;
    RAISE NOTICE 'Added purchased_by_user_id column to ticket_purchases';
  ELSE
    RAISE NOTICE 'purchased_by_user_id column already exists';
  END IF;

  -- Drop existing foreign key if it exists (in case name is wrong)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'ticket_purchases' 
    AND constraint_name = 'ticket_purchases_purchased_by_user_id_fkey'
  ) THEN
    ALTER TABLE ticket_purchases 
    DROP CONSTRAINT ticket_purchases_purchased_by_user_id_fkey;
    RAISE NOTICE 'Dropped existing foreign key constraint';
  END IF;

  -- Add foreign key constraint with explicit name
  ALTER TABLE ticket_purchases 
  ADD CONSTRAINT ticket_purchases_purchased_by_user_id_fkey 
  FOREIGN KEY (purchased_by_user_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;
  
  RAISE NOTICE 'Added foreign key constraint ticket_purchases_purchased_by_user_id_fkey';

  -- Add purchase_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ticket_purchases' 
    AND column_name = 'purchase_type'
  ) THEN
    ALTER TABLE ticket_purchases 
    ADD COLUMN purchase_type TEXT DEFAULT 'self';
    RAISE NOTICE 'Added purchase_type column to ticket_purchases';
  ELSE
    RAISE NOTICE 'purchase_type column already exists';
  END IF;

  -- Add guest_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ticket_purchases' 
    AND column_name = 'guest_count'
  ) THEN
    ALTER TABLE ticket_purchases 
    ADD COLUMN guest_count INTEGER DEFAULT 1;
    RAISE NOTICE 'Added guest_count column to ticket_purchases';
  ELSE
    RAISE NOTICE 'guest_count column already exists';
  END IF;

END $$;

-- Verify the changes
SELECT 
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.columns c
WHERE c.table_name = 'ticket_purchases' 
    AND c.column_name IN ('purchased_by_user_id', 'purchase_type', 'guest_count')
ORDER BY c.column_name;

-- Show all foreign keys on ticket_purchases
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'ticket_purchases' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name IN ('purchased_by_user_id', 'user_id', 'event_id', 'ticket_id');
