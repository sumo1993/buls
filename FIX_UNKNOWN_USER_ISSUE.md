# Fix "Recorded by Unknown User" Issue

## Problem
When the treasurer records a loan payment, the payment note says:
> "Recorded by Unknown User on 10/12/2026"

Instead of showing the treasurer's actual name.

## Root Cause
The treasurer's account in the database has `full_name` set to **"Unknown User"** or **NULL**.

From server logs:
```
🔍 GET /api/loans - User: {
  id: '6f5445e8-88f3-40b1-95f0-33860e23a053',
  clerk_id: 'user_3K624DNQSDzwNaAIPHpqkYYMiiY',
  role: 'treasurer',
  name: 'Unknown User'  // ← PROBLEM
}
```

## Where This Happens

When the treasurer records a payment, the code automatically adds a note:

**File**: `app/treasurer/page.tsx` (line 963)

```typescript
notes: paymentFormData.notes || `Recorded by ${user.full_name} on ${new Date().toLocaleDateString()}`
```

If `user.full_name` is "Unknown User" or empty, that's what appears in the note.

## Solution

### Step 1: Update Treasurer's Name in Database

Run this SQL in Supabase SQL Editor:

```sql
-- Check current data
SELECT 
  id,
  clerk_id,
  full_name,
  email,
  role
FROM users
WHERE id = '6f5445e8-88f3-40b1-95f0-33860e23a053';

-- Update to actual name (replace 'John Smith' with real name)
UPDATE users
SET full_name = 'John Smith'  -- ← CHANGE THIS
WHERE id = '6f5445e8-88f3-40b1-95f0-33860e23a053';

-- Verify update
SELECT 
  id,
  full_name,
  email,
  role
FROM users
WHERE id = '6f5445e8-88f3-40b1-95f0-33860e23a053';
```

### Step 2: (Optional) Fix Existing Payment Notes

If you want to update payments that already say "Unknown User":

```sql
-- Check which payments have "Unknown User" in notes
SELECT 
  id,
  loan_id,
  amount,
  payment_date,
  notes
FROM loan_repayments
WHERE notes LIKE '%Unknown User%'
ORDER BY payment_date DESC;

-- Update them (replace 'John Smith' with real name)
UPDATE loan_repayments
SET notes = REPLACE(notes, 'Unknown User', 'John Smith')  -- ← CHANGE THIS
WHERE notes LIKE '%Unknown User%';

-- Verify
SELECT 
  id,
  loan_id,
  notes
FROM loan_repayments
WHERE notes LIKE '%John Smith%'  -- ← CHANGE THIS
ORDER BY payment_date DESC;
```

### Step 3: Refresh Application

After updating the database:

1. The treasurer should log out and log back in
2. Or just refresh the browser at http://localhost:3000
3. The user data will be re-synced from the database

## Why This Happened

The "Unknown User" value could come from:

1. **Initial user sync failed**: When the user first signed up via Clerk, the sync to Supabase didn't get the full name
2. **Clerk profile incomplete**: The user's Clerk profile doesn't have a name set
3. **Manual database entry**: The user was created directly in Supabase without a proper name

## How to Check Clerk Profile

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to Users
3. Find user with Clerk ID: `user_3K624DNQSDzwNaAIPHpqkYYMiiY`
4. Check if "Name" or "Full Name" field is filled
5. If empty, update it in Clerk
6. Trigger a user sync in your app (or use the webhook)

## Future Prevention

To prevent this in the future, you can add validation:

### Option 1: Require Name on Signup

Update Clerk settings to make "Name" a required field during signup.

### Option 2: Add Database Constraint

```sql
-- Add a check to ensure full_name is not empty
ALTER TABLE users
ADD CONSTRAINT users_full_name_not_empty 
CHECK (full_name IS NOT NULL AND full_name != '' AND full_name != 'Unknown User');
```

⚠️ **Note**: This will fail if you try to add it while "Unknown User" records exist. Fix those first.

### Option 3: Default Value in User Sync

Update the user sync logic to use email username as fallback:

```typescript
const full_name = clerkUser.firstName && clerkUser.lastName
  ? `${clerkUser.firstName} ${clerkUser.lastName}`
  : clerkUser.fullName
  || clerkUser.username
  || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0]
  || 'User'  // Better than "Unknown User"
```

## Test the Fix

1. Update the treasurer's name in database (Step 1)
2. Refresh browser
3. Have treasurer record a new test payment
4. Check the payment note - should now say:
   > "Recorded by John Smith on 10/12/2026"

## SQL Scripts Created

- `FIX_TREASURER_NAME.sql` - Updates the treasurer's account name
- `FIX_PAYMENT_NOTES.sql` - Updates existing payment notes

---

**Status**: Identified - Database update required  
**Impact**: Cosmetic - doesn't affect functionality  
**Priority**: Medium - affects audit trail clarity  
