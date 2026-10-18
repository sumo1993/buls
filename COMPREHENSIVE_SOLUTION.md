# Comprehensive Solution for Event Checkin Search

## Current State Analysis

### ✅ What's Working:
1. **API endpoint** `/api/event-registrations?eventId=4` correctly fetches:
   - Free event registrations
   - Ticket purchasers  
   - Ticket guests (when table exists)
2. **Checkin page** `/secretary/events/4/checkin` has:
   - Comprehensive search across name, email, ticket#, phone, passport
   - Helper functions to handle nested vs flat data structures
   - Debug logging for troubleshooting
3. **Database tables** exist for core functionality

### ❌ What's Broken:
1. **Database schema mismatch**: `users` table missing `phone_number` and `passport_number` columns
2. **Search won't work** because API returns `null` for phone/passport fields
3. **No guest management** because `ticket_guests` table doesn't exist

## Immediate Fix: Database Migration

### Step 1: Run the Migration
Copy and paste the entire content from `ADD_MISSING_COLUMNS_MIGRATION.sql` into **Supabase SQL Editor** and run it.

### Step 2: Verify Migration
```sql
-- Check if columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('phone_number', 'passport_number', 'is_member', 'membership_number');

-- Check if ticket_guests table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'ticket_guests';

-- Test the comprehensive view
SELECT * FROM event_attendees_comprehensive WHERE event_id = 4 LIMIT 5;
```

### Step 3: Add Test Data (Optional)
If you need test data for development:

```sql
-- Update existing users with phone/passport
UPDATE users 
SET 
  phone_number = CASE 
    WHEN id % 3 = 0 THEN '7054636640'
    WHEN id % 3 = 1 THEN '7054636641' 
    WHEN id % 3 = 2 THEN '7054636642'
  END,
  passport_number = CASE
    WHEN id % 3 = 0 THEN 'AB123456'
    WHEN id % 3 = 1 THEN 'CD789012'
    WHEN id % 3 = 2 THEN 'EF345678'
  END
WHERE phone_number IS NULL 
LIMIT 10;
```

## Enhanced Features Implementation

Once migration is complete, the system will support:

### 1. **Comprehensive Search Across All Attendees**
- ✅ Member self-purchase (uses member profile info)
- ✅ Treasurer buying for members (can capture guest info)
- ✅ Member buying for guests (multiple attendees per ticket)
- ✅ Phone number search for ALL attendees
- ✅ Passport number search for ALL attendees

### 2. **Multiple Purchase Scenarios**
```javascript
// Scenario 1: Member buys own ticket
purchase_type = 'self'
guest_count = 1

// Scenario 2: Treasurer buys for member
purchase_type = 'for_member'  
guest_count = 1
purchased_by_user_id = treasurer_user_id

// Scenario 3: Member buys ticket with guests
purchase_type = 'with_guests'
guest_count = 3
// ticket_guests table stores guest info
```

### 3. **API Returns Complete Data Structure**
The API now returns:
```json
{
  "registrations": [
    {
      "id": "uuid",
      "type": "ticket", // or "free", "guest"
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone_number": "7054636640",
      "passport_number": "AB123456",
      "ticket_number": "TKT0000000640",
      "source_type": "ticket_purchase", // or "registration", "ticket_guest"
      "is_guest": false,
      "guest_of": null
    }
  ]
}
```

## Testing After Migration

### Test 1: API Response
```bash
curl "http://localhost:3000/api/event-registrations?eventId=4"
```
Check that:
- Response has `phone_number` and `passport_number` fields
- No errors in console

### Test 2: Search Functionality
Go to `/secretary/events/4/checkin` and search for:
- "7054636640" (should show matching attendees)
- "640" (should show ticket number matches)
- Passport numbers (if data exists)

### Test 3: Debug Console
Open browser console and run:
```javascript
// Test API directly
fetch('/api/event-registrations?eventId=4')
  .then(r => r.json())
  .then(data => {
    console.log('Total:', data.registrations?.length);
    console.log('Sample:', data.registrations?.[0]);
    
    // Test search for specific phone
    const withPhone = data.registrations?.filter(a => {
      const phone = a.phone_number || a.user?.phone_number;
      return phone && phone.includes('7054636640');
    });
    console.log('With phone 7054636640:', withPhone);
  });
```

## Files That Need Updates for Guest Feature

Once migration is complete, update these files:

### 1. **Ticket Purchase Forms**
- Add guest information fields when purchasing tickets
- Store guest phone/passport in `ticket_guests` table

### 2. **API Endpoints**
- `/api/tickets/purchase` - Handle guest data submission
- `/api/tickets/[id]/guests` - Manage guests for a ticket

### 3. **Checkin Page Enhancements**
Already implemented! The search logic already handles:
- Guests vs members
- Nested vs flat data structures
- Phone/passport search for all attendee types

## Quick Troubleshooting

### Issue: "No results found" after migration
1. Check API response: `/api/event-registrations?eventId=4`
2. Verify data exists in database for event 4
3. Check browser console for errors

### Issue: Phone number search not working
1. Verify `phone_number` column exists in `users` table
2. Check if users have phone numbers in database
3. Test API directly to see returned data

### Issue: Development server not running
```bash
cd buls-main
npm run dev
```

## Summary

The solution is **ready to go** once the database migration is complete. The codebase already includes:

1. ✅ Comprehensive API for fetching all attendee types
2. ✅ Advanced search logic for phone/passport numbers
3. ✅ Support for guests through `ticket_guests` table
4. ✅ Debug tools for troubleshooting
5. ✅ Migration script ready to run

**Next Action:** Run `ADD_MISSING_COLUMNS_MIGRATION.sql` in Supabase SQL Editor to fix the database schema mismatch.