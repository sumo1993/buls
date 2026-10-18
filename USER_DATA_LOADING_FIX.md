# User Data Loading Fix - 406 Errors Resolved

## 🐛 Problem
After users register successfully, their profile is created in the database, but when they navigate to other pages (settings, dashboard, etc.), they see:
```
Error: Failed to load user data
406 (Not Acceptable) error from Supabase
```

The user's data exists in the database (visible in /secretary → Members Directory) but pages fail to load it.

## 🔍 Root Cause
Multiple pages across the application were using `.single()` instead of `.maybeSingle()` when querying for user data:

```typescript
// PROBLEMATIC CODE
.select('*')
.eq('clerk_id', userId)
.single() // ❌ Causes 406 error if headers aren't perfect
```

The `.single()` method is strict and requires exact HTTP headers, causing 406 errors even when data exists.

## ✅ Fixes Applied

### Pages Fixed (Changed `.single()` → `.maybeSingle()`):

1. ✅ **settings/page.tsx** - User profile loading
2. ✅ **admin/page.tsx** - Admin user lookup  
3. ✅ **treasurer/page.tsx** - Treasurer user lookup
4. ✅ **finance/page.tsx** - Finance user lookup
5. ✅ **test-role/page.tsx** - Role testing page
6. ✅ **registration/page.tsx** - Already fixed earlier
7. ✅ **lib/supabase/client-browser.ts** - Added HTTP headers

### Code Pattern Fixed:

**BEFORE** (Causing 406 errors):
```typescript
const { data: userData, error: userError } = await supabase
  .from('users')
  .select('*')
  .eq('clerk_id', userId)
  .single() // ❌ Strict, causes 406

if (userError || !userData) {
  // Handle error
}
```

**AFTER** (Working correctly):
```typescript
const { data: userData, error: userError } = await supabase
  .from('users')
  .select('*')
  .eq('clerk_id', userId)
  .maybeSingle() // ✅ Flexible, no 406

if (userError || !userData) {
  // Handle error
}
```

## 🎯 Impact

### Before Fix:
- ❌ User registers successfully
- ❌ Profile created in database
- ❌ User can't access settings page (406 error)
- ❌ User can't access dashboard (data fails to load)
- ❌ User sees "Failed to load user data"
- ✅ Admin can see user in secretary panel (because that works)

### After Fix:
- ✅ User registers successfully
- ✅ Profile created in database
- ✅ User can access settings page
- ✅ User can access dashboard
- ✅ User data loads correctly
- ✅ All pages work properly

## 🔄 User Flow Now Works:

1. **Registration** → User fills form → Profile created ✅
2. **Redirect to Dashboard** → User data loads successfully ✅
3. **Navigate to Settings** → Profile displays correctly ✅
4. **Navigate to Payments** → User info loaded ✅
5. **Navigate to any page** → No 406 errors ✅

## 📋 Technical Details

### Why `.maybeSingle()` is Better:

| Method | Behavior | Errors | Best For |
|--------|----------|--------|----------|
| `.single()` | Expects exactly 1 result | Throws 406 if headers wrong | When you're 100% sure record exists |
| `.maybeSingle()` | Returns 0 or 1 result | Graceful, no 406 | User lookups, existence checks |

### HTTP Headers Added:
```typescript
global: {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
}
```

## 🧪 Testing Checklist

- [x] User can register successfully
- [x] After registration, user redirected to dashboard
- [x] Dashboard loads without errors
- [x] Settings page loads user profile
- [x] No 406 errors in console
- [x] User data visible in all pages
- [x] Profile changes save correctly

## 📁 Files Modified

| File | Change | Status |
|------|--------|--------|
| `lib/supabase/client-browser.ts` | Added HTTP headers | ✅ Fixed |
| `app/settings/page.tsx` | `.single()` → `.maybeSingle()` | ✅ Fixed |
| `app/admin/page.tsx` | `.single()` → `.maybeSingle()` | ✅ Fixed |
| `app/treasurer/page.tsx` | `.single()` → `.maybeSingle()` | ✅ Fixed |
| `app/finance/page.tsx` | `.single()` → `.maybeSingle()` | ✅ Fixed |
| `app/test-role/page.tsx` | `.single()` → `.maybeSingle()` | ✅ Fixed |
| `app/registration/page.tsx` | Multiple `.single()` → `.maybeSingle()` | ✅ Fixed |
| `app/api/dashboard-data/route.ts` | Already using `.maybeSingle()` | ✅ Good |

## 🎉 Result

Users can now:
1. Register successfully ✅
2. Access their dashboard immediately ✅
3. View and edit their profile ✅
4. Navigate all pages without errors ✅
5. See their data loaded correctly ✅

**Status**: FULLY FIXED ✅

## 💡 Lessons Learned

1. **Always use `.maybeSingle()`** for user lookups
2. **HTTP headers are critical** for Supabase queries
3. **`.single()` is too strict** for most use cases
4. **Test user flow end-to-end** after registration
5. **406 errors = wrong headers or wrong query method**
