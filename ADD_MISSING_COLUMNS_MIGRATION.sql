-- ADD MISSING COLUMNS MIGRATION
-- Run this in Supabase SQL Editor to add phone_number and passport_number columns to users table

-- 1. First check current schema
SELECT '=== CURRENT SCHEMA CHECK ===' as info;

SELECT 
  table_name,
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. Add missing columns to users table
DO $$
BEGIN
  -- Add phone_number if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE users ADD COLUMN phone_number TEXT;
    RAISE NOTICE 'Added phone_number column to users table';
  ELSE
    RAISE NOTICE 'phone_number column already exists in users table';
  END IF;
  
  -- Add passport_number if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'passport_number'
  ) THEN
    ALTER TABLE users ADD COLUMN passport_number TEXT;
    RAISE NOTICE 'Added passport_number column to users table';
  ELSE
    RAISE NOTICE 'passport_number column already exists in users table';
  END IF;
  
  -- Add is_member if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_member'
  ) THEN
    ALTER TABLE users ADD COLUMN is_member BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added is_member column to users table';
  ELSE
    RAISE NOTICE 'is_member column already exists in users table';
  END IF;
  
  -- Add membership_number if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'membership_number'
  ) THEN
    ALTER TABLE users ADD COLUMN membership_number TEXT;
    RAISE NOTICE 'Added membership_number column to users table';
  ELSE
    RAISE NOTICE 'membership_number column already exists in users table';
  END IF;
END $$;

-- 3. Create ticket_guests table if it doesn't exist
CREATE TABLE IF NOT EXISTS ticket_guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_purchase_id UUID NOT NULL REFERENCES ticket_purchases(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  passport_number TEXT,
  relationship_to_purchaser TEXT DEFAULT 'guest',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ticket_guests_ticket_id ON ticket_guests(ticket_purchase_id);
CREATE INDEX IF NOT EXISTS idx_ticket_guests_phone ON ticket_guests(phone_number);
CREATE INDEX IF NOT EXISTS idx_ticket_guests_passport ON ticket_guests(passport_number);

-- 4. Add purchaser columns to ticket_purchases if they don't exist
DO $$
BEGIN
  -- Add purchased_by_user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ticket_purchases' AND column_name = 'purchased_by_user_id'
  ) THEN
    ALTER TABLE ticket_purchases 
    ADD COLUMN purchased_by_user_id UUID REFERENCES users(id);
    RAISE NOTICE 'Added purchased_by_user_id column to ticket_purchases table';
  END IF;
  
  -- Add purchase_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ticket_purchases' AND column_name = 'purchase_type'
  ) THEN
    ALTER TABLE ticket_purchases 
    ADD COLUMN purchase_type TEXT DEFAULT 'self';
    RAISE NOTICE 'Added purchase_type column to ticket_purchases table';
  END IF;
  
  -- Add guest_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ticket_purchases' AND column_name = 'guest_count'
  ) THEN
    ALTER TABLE ticket_purchases 
    ADD COLUMN guest_count INTEGER DEFAULT 1;
    RAISE NOTICE 'Added guest_count column to ticket_purchases table';
  END IF;
END $$;

-- 5. Create comprehensive view for attendee search with member profile data
CREATE OR REPLACE VIEW event_attendees_comprehensive AS
SELECT 
  -- Ticket purchaser (user) with member profile data
  'user' as source_type,
  u.id as source_id,
  tp.event_id,
  u.id as user_id,
  u.full_name,
  u.email,
  COALESCE(u.phone_number, mp.phone) as phone_number,
  COALESCE(u.passport_number, mp.passport_number) as passport_number,
  u.membership_number,
  'purchaser' as attendee_type,
  tp.id as ticket_purchase_id,
  tp.ticket_number,
  tp.payment_status,
  tp.purchased_by_user_id,
  tp.purchase_type,
  tp.created_at as registered_at
FROM ticket_purchases tp
JOIN users u ON tp.user_id = u.id
LEFT JOIN members_profile mp ON u.id = mp.user_id
WHERE tp.payment_status = 'paid'

UNION ALL

SELECT 
  -- Ticket guests
  'guest' as source_type,
  tg.id as source_id,
  tp.event_id,
  NULL as user_id, -- Guest doesn't have user account
  tg.full_name,
  tg.email,
  tg.phone_number,
  tg.passport_number,
  NULL as membership_number,
  'guest' as attendee_type,
  tp.id as ticket_purchase_id,
  tp.ticket_number,
  tp.payment_status,
  tp.purchased_by_user_id,
  tp.purchase_type,
  tg.created_at as registered_at
FROM ticket_guests tg
JOIN ticket_purchases tp ON tg.ticket_purchase_id = tp.id
WHERE tp.payment_status = 'paid'

UNION ALL

SELECT 
  -- Event registrations (free) with member profile data
  'registration' as source_type,
  er.id as source_id,
  er.event_id,
  u.id as user_id,
  u.full_name,
  u.email,
  COALESCE(u.phone_number, mp.phone) as phone_number,
  COALESCE(u.passport_number, mp.passport_number) as passport_number,
  u.membership_number,
  'free_registration' as attendee_type,
  NULL as ticket_purchase_id,
  NULL as ticket_number,
  er.status as payment_status,
  NULL as purchased_by_user_id,
  NULL as purchase_type,
  er.registered_at
FROM event_registrations er
JOIN users u ON er.user_id = u.id
LEFT JOIN members_profile mp ON u.id = mp.user_id
WHERE er.status = 'registered';

-- 6. Add trigger for updated_at on ticket_guests
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ticket_guests_updated_at ON ticket_guests;
CREATE TRIGGER update_ticket_guests_updated_at 
BEFORE UPDATE ON ticket_guests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Verify the schema
SELECT '=== SCHEMA VERIFICATION ===' as info;

SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'ticket_purchases', 'ticket_guests')
ORDER BY table_name, ordinal_position;

SELECT '=== MIGRATION COMPLETE ===' as info;
SELECT 'Phone and passport columns added to users table' as message;
SELECT 'Ticket guests table created' as message;
SELECT 'Comprehensive view created for search' as message;

-- Test the view with event ID 4
SELECT '=== TEST VIEW FOR EVENT 4 ===' as info;
SELECT * FROM event_attendees_comprehensive WHERE event_id = 4 LIMIT 5;

-- Show usage example
SELECT '=== USAGE EXAMPLES ===' as info;
SELECT 'To search attendees by phone (7054636640):' as example;
SELECT 'SELECT * FROM event_attendees_comprehensive WHERE phone_number LIKE ''%7054636640%'';' as query;

SELECT 'To search attendees by passport:' as example;
SELECT 'SELECT * FROM event_attendees_comprehensive WHERE passport_number LIKE ''%AB123456%'';' as query;