# Quick Migration Guide for Phone & Passport Search

## Problem
The `/secretary/events/4/checkin` page shows "No results found" for searches like "7054636640" and "640" because:
1. The `users` table is missing `phone_number` and `passport_number` columns
2. The API code expects these columns but they don't exist in the database

## Solution
Run the following SQL migration in your Supabase SQL Editor to add the missing columns:

### Option 1: Run Complete Migration (Recommended)
Copy and paste the entire content from `ADD_MISSING_COLUMNS_MIGRATION.sql` into the Supabase SQL Editor and run it.

### Option 2: Run Minimum Migration
If you just want to fix the immediate search issue, run this SQL:

```sql
-- Add phone_number column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add passport_number column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_number TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('phone_number', 'passport_number')
ORDER BY column_name;
```

## Verification Steps
After running the migration:

1. **Check database schema:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'users' 
   ORDER BY ordinal_position;
   ```

2. **Test the API:**
   - Make sure the development server is running: `npm run dev`
   - Visit: `/api/event-registrations?eventId=4`
   - Check that attendees have `phone_number` and `passport_number` fields

3. **Test search functionality:**
   - Go to `/secretary/events/4/checkin`
   - Search for "7054636640" (should find matches)
   - Search for "640" (should find ticket number matches)
   - Search for passport numbers (if data exists)

## If Search Still Doesn't Work
1. **Check API response:** Use the browser console to run:
   ```javascript
   fetch('/api/event-registrations?eventId=4')
     .then(r => r.json())
     .then(data => console.log('Data:', data))
   ```

2. **Check data exists:** Verify there are actual registrations for event 4:
   ```sql
   SELECT COUNT(*) FROM event_registrations WHERE event_id = 4;
   SELECT COUNT(*) FROM ticket_purchases WHERE event_id = 4 AND payment_status = 'paid';
   ```

3. **Update existing users:** If columns were added but users don't have data:
   ```sql
   -- Add sample test data (optional)
   UPDATE users 
   SET phone_number = '7054636640', passport_number = 'AB123456'
   WHERE email LIKE '%example.com%'
   LIMIT 1;
   ```

## Next Steps After Migration
1. **Update user registration forms** to collect phone and passport information
2. **Update ticket purchase flows** to allow adding guests with their phone/passport
3. **Test all purchase scenarios:**
   - Member buys own ticket (uses member info)
   - Treasurer buys ticket for member (captures guest info)
   - Member buys ticket with guests (multiple attendees)

## Files Modified
- `app/api/event-registrations/route.ts` - Already updated to handle missing columns
- `app/secretary/events/[id]/checkin/page.tsx` - Already has search logic for phone/passport
- `ADD_MISSING_COLUMNS_MIGRATION.sql` - Migration script
- `enhanced-ticketing-schema.sql` - Complete enhanced ticketing system

The system is ready to support comprehensive search across ALL attendee information (members + guests) once the database schema is updated.


## Important Note: Data Location

The system stores phone and passport information in two possible locations:

1. **`users` table** (preferred): `phone_number`, `passport_number` columns
2. **`members_profile` table** (legacy): `phone`, `passport_number` columns

### If Data is in `members_profile` table:
Run this SQL to sync it to the `users` table after adding the columns:

```sql
-- Sync phone/passport data from members_profile to users
UPDATE users u
SET 
  phone_number = COALESCE(u.phone_number, mp.phone),
  passport_number = COALESCE(u.passport_number, mp.passport_number)
FROM members_profile mp
WHERE u.id = mp.user_id
  AND (mp.phone IS NOT NULL OR mp.passport_number IS NOT NULL);
```

### Check Current Data Location:
Run `DATABASE_DIAGNOSTIC.sql` to see where your phone/passport data is stored.

## API Compatibility

The updated API automatically checks both locations:
1. First looks in `users` table
2. Falls back to `members_profile` table if not found
3. Returns combined data for search functionality

This ensures backward compatibility while migrating to the new schema.