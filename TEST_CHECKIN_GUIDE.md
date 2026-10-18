# How to Test the Event Checkin Page

## Current Status
✅ **Server is running** at http://localhost:3000  
❌ **Database schema needs migration** (phone/passport columns missing)  
✅ **Code implementation is complete**

## Testing Steps

### Step 1: Run Database Migration (CRITICAL)
1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Choose one of these migration files:
   - **Complete migration**: Copy `ADD_MISSING_COLUMNS_MIGRATION.sql`
   - **Minimal migration**: Copy `MINIMAL_MIGRATION.sql`
3. Paste and run the SQL
4. Verify success messages appear

### Step 2: Add Test Data (Optional)
If you need test attendees for event 4, run this SQL:

```sql
-- First, check if event 4 exists
SELECT id, title FROM events WHERE id = 4;

-- Add test registrations if event exists
INSERT INTO event_registrations (event_id, user_id, status)
SELECT 4, id, 'registered'
FROM users 
WHERE role IN ('member', 'secretary', 'treasurer')
LIMIT 3
ON CONFLICT DO NOTHING;

-- Add test ticket purchases
INSERT INTO ticket_purchases (event_id, user_id, ticket_number, payment_status, quantity, total_price)
SELECT 
  4, 
  id, 
  'TKT' || LPAD(CAST(id AS TEXT), 10, '0'), 
  'paid', 
  1, 
  50
FROM users 
WHERE role IN ('member', 'secretary')
LIMIT 2
ON CONFLICT DO NOTHING;

-- Update test users with phone/passport
UPDATE users 
SET 
  phone_number = CASE id % 3 
    WHEN 0 THEN '7054636640'
    WHEN 1 THEN '7054636641'
    WHEN 2 THEN '7054636642'
  END,
  passport_number = CASE id % 3
    WHEN 0 THEN 'AB123456'
    WHEN 1 THEN 'CD789012'
    WHEN 2 THEN 'EF345678'
  END
WHERE phone_number IS NULL
LIMIT 5;
```

### Step 3: Test the Checkin Page
1. Open browser to: http://localhost:3000
2. Sign in with a **secretary or admin account**
3. Navigate to: `/secretary/events/4/checkin`
4. Test search functionality:

#### Search Tests:
- **Phone number**: Type "7054636640"
- **Ticket number**: Type "640" (last 3 digits)
- **Name**: Type part of a user's name
- **Email**: Type part of an email

### Step 4: Use Browser Debug Tools
If search isn't working, open browser console (F12 → Console) and:

1. **Test API directly**:
```javascript
fetch('/api/event-registrations?eventId=4')
  .then(r => r.json())
  .then(data => {
    console.log('API Response:', data);
    console.log('Total attendees:', data.registrations?.length);
    if (data.registrations?.length > 0) {
      console.log('Sample:', data.registrations[0]);
      console.log('Has phone?', !!data.registrations[0].phone_number);
    }
  });
```

2. **Use debug script**: Copy and paste `browser-debug-script.js` into console

### Step 5: Verify Search Logic
The checkin page searches across:
1. **Name** (from users table)
2. **Email** (from users table)
3. **Phone number** (from users or members_profile table)
4. **Passport number** (from users or members_profile table)
5. **Ticket number** (from ticket_purchases table)
6. **Last 3 digits** of ticket number

## Troubleshooting

### Issue: "No results found"
1. Check API response in browser console
2. Verify database has data for event 4
3. Ensure user is authenticated as secretary/admin
4. Check database migration was successful

### Issue: Phone search not working
1. Verify `phone_number` column exists in `users` table
2. Check if users have phone numbers in database
3. Test API response for phone data

### Issue: Development server errors
1. Check server logs in terminal
2. Verify all dependencies: `npm install`
3. Check environment variables in `.env.local`

## Migration Verification
After running migration, verify with:

```sql
-- Check columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('phone_number', 'passport_number');

-- Check data exists
SELECT COUNT(*) as total_users,
       COUNT(phone_number) as users_with_phone,
       COUNT(passport_number) as users_with_passport
FROM users;
```

## Quick Test Commands
From terminal (in buls-main directory):

```bash
# Check system status
node check-system-status.js

# Test API response
node test-api-direct.js

# Run database diagnostic (copy to Supabase)
cat DATABASE_DIAGNOSTIC.sql
```

## Expected Results
After successful migration and with test data:

1. **API endpoint** `/api/event-registrations?eventId=4` returns attendees with phone/passport data
2. **Checkin page** search finds attendees by phone number "7054636640"
3. **Search works** for ticket numbers containing "640"
4. **All attendee types** appear (free registrations, ticket purchasers)

The system is **ready to use** once the database migration is complete!