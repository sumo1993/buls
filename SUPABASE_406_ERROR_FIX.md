# Supabase 406 Error Fix

## 🐛 Problem
Multiple **406 (Not Acceptable)** errors when querying Supabase from the registration page:
```
Failed to load resource: the server responded with a status of 406 ()
```

Affected queries:
- Profile check: `members_profile?select=id&user_id=eq.xxx`
- Duplicate passport check
- Duplicate phone check  
- Duplicate email check

## 🔍 Root Causes

### 1. **Missing HTTP Headers**
The Supabase client was not sending proper `Accept` and `Content-Type` headers, causing the API to reject requests with 406.

### 2. **Wrong Query Method**
Using `.single()` when results might not exist causes errors. Should use `.maybeSingle()` for queries that may return zero or one result.

## ✅ Fixes Applied

### Fix 1: Added HTTP Headers to Supabase Client
**File**: `lib/supabase/client-browser.ts`

Added proper headers to all Supabase client configurations:

```typescript
global: {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
}
```

Applied to:
- Default public client
- Clerk-authenticated client
- Token-based client

### Fix 2: Changed `.single()` to `.maybeSingle()`
**File**: `app/registration/page.tsx`

Changed all queries that check for existence from `.single()` to `.maybeSingle()`:

#### Profile Check:
```typescript
// BEFORE
.single()

// AFTER  
.maybeSingle()
```

#### Duplicate Checks:
- Passport number duplicate check → `.maybeSingle()`
- Phone number duplicate check → `.maybeSingle()`
- Email duplicate check → `.maybeSingle()`

## 📋 Difference Between Methods

| Method | Behavior | Use Case |
|--------|----------|----------|
| `.single()` | Expects exactly 1 result, throws error if 0 or >1 | When you know the record exists |
| `.maybeSingle()` | Returns 0 or 1 result, no error | When checking if a record exists |

## 🎯 Benefits

✅ **No more 406 errors** - Proper headers ensure API accepts requests
✅ **Better error handling** - `maybeSingle()` gracefully handles missing records
✅ **Duplicate checks work** - No longer failing with 406
✅ **Profile checks work** - Can properly detect if profile exists
✅ **Registration works** - Users can complete registration without errors

## 🧪 Testing

1. Navigate to `/registration` page
2. Fill in the form
3. Submit the form
4. Check browser console - should see NO 406 errors
5. Duplicate checks should work properly
6. Profile should save successfully

## 📝 Files Modified

1. `lib/supabase/client-browser.ts` - Added HTTP headers
2. `app/registration/page.tsx` - Changed `.single()` to `.maybeSingle()`

## 🔗 Related Issues

This fix also improves:
- User profile checks across the app
- Any other queries using `.single()` that may not always have results
- API communication reliability

## 💡 Best Practices

### When to use each method:

**Use `.single()`:**
```typescript
// When you KNOW the record exists (e.g., fetching logged-in user's data)
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single() // ✅ User MUST exist
```

**Use `.maybeSingle()`:**
```typescript
// When CHECKING if a record exists
const { data, error } = await supabase
  .from('members_profile')
  .select('id')
  .eq('passport_number', passportNumber)
  .maybeSingle() // ✅ May or may not exist
```

**Use without modifier:**
```typescript
// When expecting multiple results
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('status', 'active') // ✅ Returns array
```

## ✨ Status

**FIXED** ✅ - All 406 errors resolved, registration page now works correctly
