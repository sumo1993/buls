-- MINIMAL MIGRATION for Phone & Passport Search
-- Run this in Supabase SQL Editor to fix the checkin page

-- 1. Add missing columns to users table (safe - only if they don't exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_number TEXT;

-- 2. Create ticket_guests table for guest management
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

-- 3. Add indexes for faster search
CREATE INDEX IF NOT EXISTS idx_ticket_guests_ticket_id ON ticket_guests(ticket_purchase_id);
CREATE INDEX IF NOT EXISTS idx_ticket_guests_phone ON ticket_guests(phone_number);
CREATE INDEX IF NOT EXISTS idx_ticket_guests_passport ON ticket_guests(passport_number);

-- 4. Add purchase info columns to ticket_purchases
ALTER TABLE ticket_purchases ADD COLUMN IF NOT EXISTS purchased_by_user_id UUID REFERENCES users(id);
ALTER TABLE ticket_purchases ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'self';
ALTER TABLE ticket_purchases ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1;

-- 5. Verify the changes
SELECT '=== VERIFICATION ===' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('phone_number', 'passport_number', 'is_member', 'membership_number')
ORDER BY column_name;

SELECT '=== MIGRATION COMPLETE ===' as info;
SELECT 'Phone/passport columns added to users table' as message;
SELECT 'Ticket guests table created' as message;
SELECT 'Purchase info columns added' as message;

-- 6. Optional: Sync data from members_profile if it exists
SELECT '=== DATA SYNC OPTION ===' as info;
SELECT 'If phone/passport data exists in members_profile table, run:' as instruction;
SELECT '
UPDATE users u
SET 
  phone_number = COALESCE(u.phone_number, mp.phone),
  passport_number = COALESCE(u.passport_number, mp.passport_number)
FROM members_profile mp
WHERE u.id = mp.user_id
  AND (mp.phone IS NOT NULL OR mp.passport_number IS NOT NULL);
' as sync_sql;

-- 7. Test the checkin page after migration
SELECT '=== TEST INSTRUCTIONS ===' as info;
SELECT '1. Restart development server if it was running during migration' as step;
SELECT '2. Go to: /secretary/events/4/checkin' as step;
SELECT '3. Search for phone numbers like "7054636640"' as step;
SELECT '4. Search for ticket numbers like "640" (last 3 digits)' as step;