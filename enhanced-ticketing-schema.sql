-- Enhanced Ticketing System Schema
-- Run in Supabase SQL Editor

-- 1. First ensure users table has necessary columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS passport_number TEXT,
ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS membership_number TEXT;

-- 2. Create guest information table for ticket purchases
CREATE TABLE IF NOT EXISTS ticket_guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_purchase_id UUID NOT NULL REFERENCES ticket_purchases(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  passport_number TEXT,
  relationship_to_purchaser TEXT, -- 'self', 'guest', 'family_member', 'colleague'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ticket_guests_ticket_id ON ticket_guests(ticket_purchase_id);
CREATE INDEX IF NOT EXISTS idx_ticket_guests_phone ON ticket_guests(phone_number);
CREATE INDEX IF NOT EXISTS idx_ticket_guests_passport ON ticket_guests(passport_number);

-- 3. Add purchaser info to ticket_purchases
ALTER TABLE ticket_purchases 
ADD COLUMN IF NOT EXISTS purchased_by_user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'self', -- 'self', 'for_member', 'for_guest', 'for_non_member'
ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1;

-- 4. Create view for comprehensive attendee search
CREATE OR REPLACE VIEW event_attendees_comprehensive AS
SELECT 
  -- Ticket purchaser (user)
  'user' as source_type,
  u.id as source_id,
  tp.event_id,
  u.id as user_id,
  u.full_name,
  u.email,
  u.phone_number,
  u.passport_number,
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
  -- Event registrations (free)
  'registration' as source_type,
  er.id as source_id,
  er.event_id,
  u.id as user_id,
  u.full_name,
  u.email,
  u.phone_number,
  u.passport_number,
  u.membership_number,
  'free_registration' as attendee_type,
  NULL as ticket_purchase_id,
  NULL as ticket_number,
  er.status as payment_status,
  NULL as purchased_by_user_id,
  NULL as purchase_type,
  er.registered_at
FROM event_registrations er
JOIN users u ON er.user_id = u.id;

-- 5. Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_guests_updated_at 
BEFORE UPDATE ON ticket_guests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Verify schema
SELECT '=== SCHEMA VERIFICATION ===' as info;

SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'ticket_purchases', 'ticket_guests')
ORDER BY table_name, ordinal_position;

SELECT 'Event attendees view created. Use:' as usage;
SELECT 'SELECT * FROM event_attendees_comprehensive WHERE event_id = 4;' as example_query;