# Committee Name Issue - Root Cause & Fix

## 🔍 Root Cause Analysis

After thorough investigation, I found that **the registration form is working correctly**. Here's what I verified:

### ✅ What's Working:
1. **Form has proper `full_name` field** - Accepts user input
2. **State management works** - `handleChange` updates `formData.full_name` correctly
3. **Database save works** - `submitRegistration` saves `formData.full_name` to `users` table
4. **API fetch works** - Tickets API correctly fetches `full_name` from database

### 🐛 The Real Problem:
The database actually contains `"full_name": "Committee"` for this user. This means **someone literally typed "Committee" into the full name field** during registration.

**Why this happened:**
- User may have misunderstood the form
- User may have used a placeholder value during testing
- User didn't realize this was their actual member name that would appear on tickets

---

## ✅ Fixes Applied

### 1. **Added Form Validation** (Registration Page)

Added validation to prevent placeholder values:

```typescript
// Validate full_name is not a placeholder
const invalidNames = ['committee', 'admin', 'test', 'user', 'member', 'name', 'placeholder']
const nameToCheck = formData.full_name.toLowerCase().trim()
if (invalidNames.some(invalid => nameToCheck === invalid || nameToCheck.includes(invalid))) {
  toast.error('Please enter your real full name, not a placeholder')
  return
}

// Validate full_name has at least first and last name
if (formData.full_name.trim().split(' ').length < 2) {
  toast.error('Please enter your full name (first and last name)')
  return
}
```

### 2. **Added Helper Text** (Registration Form)

Added visual warning under the full name input:

```tsx
<p className="text-xs text-gray-500 mt-1">
  ⚠️ Enter your real name (first and last name). 
  Do not use placeholders like "Committee", "Test", or "Member".
</p>
```

### 3. **Created SQL Fix Script**

Created `FIX_COMMITTEE_NAME.sql` to help find and update users with placeholder names.

---

## 🛠️ How to Fix Existing "Committee" Names

### Option 1: Use SQL (Recommended for batch fixes)

Run this SQL in your Supabase SQL Editor:

```sql
-- 1. Find all users with "Committee" as name
SELECT id, email, full_name, created_at
FROM users
WHERE full_name ILIKE '%committee%';

-- 2. Update specific user (replace with actual email and name)
UPDATE users 
SET full_name = 'John Doe'  -- Replace with actual student name
WHERE email = 'student@example.com';  -- Replace with actual email
```

### Option 2: Use Secretary Panel (Recommended for single users)

1. Go to Secretary Panel (`/secretary`)
2. Find the member with "Committee" as name
3. Click "Edit" button
4. Update the "Full Name" field with the correct name
5. Save changes

### Option 3: Ask User to Re-register

1. Delete the user's profile from database
2. Ask them to register again with correct information
3. New validation will prevent them from using "Committee" again

---

## 🎯 Prevention

The fixes applied will prevent this issue from happening again:

1. ✅ Form validates against placeholder names
2. ✅ Form requires first and last name (minimum 2 words)
3. ✅ Clear helper text warns users not to use placeholders
4. ✅ Validation happens before database save

---

## 📝 Next Steps

1. **Identify affected users**: Run the SQL query to find all users with placeholder names
2. **Update names**: Use Secretary Panel or SQL to update to real names
3. **Notify users**: If needed, contact users to get their correct names
4. **Test registration**: Try registering with "Committee" - should now be blocked

---

## 🔄 Files Modified

1. `app/registration/page.tsx` - Added validation and helper text
2. `FIX_COMMITTEE_NAME.sql` - SQL script to find and fix placeholder names
3. `COMMITTEE_NAME_FIX.md` - This documentation

---

## ✨ Status

**FIXED** ✅ - Registration form now prevents placeholder names, existing data can be updated via SQL or Secretary Panel
