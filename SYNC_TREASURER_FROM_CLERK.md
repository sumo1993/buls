# Sync Treasurer Name from Clerk

## Problem
The treasurer's name shows as "Unknown User" because the Supabase `users` table doesn't have the correct `full_name` value.

## Solution Options

### Option 1: Check & Update Manually in Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Run this query to see the treasurer's current data:

```sql
SELECT 
  id,
  clerk_id,
  full_name,
  email,
  role
FROM users
WHERE clerk_id = 'user_3K624DNQSDzwNaAIPHpqkYYMiiY';
```

3. Check the `email` field - this will tell you who the treasurer is
4. Then update with the correct name:

```sql
UPDATE users
SET full_name = 'FirstName LastName'  -- Use the actual treasurer's name
WHERE clerk_id = 'user_3K624DNQSDzwNaAIPHpqkYYMiiY';
```

### Option 2: Check Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Navigate to **Users**
3. Search for user ID: `user_3K624DNQSDzwNaAIPHpqkYYMiiY`
4. Check the user's profile to see their name
5. If the name is not set in Clerk:
   - Click on the user
   - Click "Edit" or update profile
   - Set the First Name and Last Name
6. If the name IS set in Clerk but not in Supabase:
   - Trigger a user sync using the app's sync feature
   - Or manually update Supabase using Option 1

### Option 3: Use the App's User Sync Feature

1. Log in as admin at http://localhost:3000/admin
2. Navigate to **Sync Users from Clerk** (if this feature exists)
3. Click "Sync All Users"
4. This will pull the latest data from Clerk including names

### Option 4: Automatic Fix - Update Code to Show Email if Name Missing

If you want to show the email instead of "Unknown User" when name is missing:

**File**: `app/treasurer/page.tsx` (line ~963)

Change from:
```typescript
notes: paymentFormData.notes || `Recorded by ${user.full_name} on ${new Date().toLocaleDateString()}`
```

To:
```typescript
notes: paymentFormData.notes || `Recorded by ${user.full_name || user.email || 'Treasurer'} on ${new Date().toLocaleDateString()}`
```

This way it will show:
- The full name if available
- The email if name is not available  
- "Treasurer" as last resort

## What You Should Do

**Step 1**: Run the query in Supabase to see the treasurer's email:
```sql
SELECT clerk_id, full_name, email FROM users 
WHERE clerk_id = 'user_3K624DNQSDzwNaAIPHpqkYYMiiY';
```

**Step 2**: Tell me:
- What email shows up?
- What is the actual treasurer's name?

**Step 3**: I'll create the exact SQL script with the correct name to update both:
- The user's `full_name` in the `users` table
- The existing payment notes that say "Unknown User"

## Why I Can't Get It Automatically

I don't have direct access to:
- Your Supabase database
- Your Clerk account
- The actual user profiles

So I need you to provide the treasurer's actual name, and then I can create the proper update script! 😊

---

**Quick Test**: Once you know the name, you can run:

```sql
-- Replace 'John Smith' with actual name
UPDATE users
SET full_name = 'John Smith'
WHERE clerk_id = 'user_3K624DNQSDzwNaAIPHpqkYYMiiY';

-- Fix existing notes
UPDATE loan_repayments
SET notes = REPLACE(notes, 'Unknown User', 'John Smith')
WHERE notes LIKE '%Unknown User%';
```
