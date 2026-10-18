# Role & Status Sync Fix - Clerk + Supabase

## Problem
When admin changes a user's role from "member" to "secretary" in the admin panel:
1. ✅ Role updates in Supabase
2. ❌ Role does NOT update in Clerk
3. ❌ User can't access secretary panel because Clerk still shows "member"

## Root Cause
The admin page was updating Supabase directly without syncing to Clerk:

```typescript
// OLD CODE (BROKEN)
await supabase
  .from('users')
  .update({ role: newRole })
  .eq('id', targetUserId)
// Only updates Supabase, Clerk metadata stays as "member"
```

## Solution
Created API endpoints that update BOTH Supabase AND Clerk:

### 1. Role API Endpoint (`/api/admin/users/[id]/role`)
- Updates role in Supabase
- Updates `publicMetadata.role` in Clerk
- Creates audit log
- Returns success message

### 2. Status API Endpoint (`/api/admin/users/[id]/status`)
- Updates status in Supabase
- Updates `publicMetadata.status` in Clerk
- Creates audit log

### 3. Admin Page Updates
- `changeRole()` now calls API endpoint instead of direct Supabase update
- `changeStatus()` now calls API endpoint instead of direct Supabase update

## How It Works Now

### When Admin Changes Role:
1. Admin selects "secretary" from dropdown
2. Frontend calls `/api/admin/users/[id]/role` with `{ role: "secretary" }`
3. API updates Supabase: `users.role = "secretary"`
4. API updates Clerk: `publicMetadata.role = "secretary"`
5. User signs out and signs back in
6. Clerk provides updated role
7. User can now access secretary panel! ✅

## Testing Steps

### Test 1: Change Role to Secretary
1. Go to admin panel: http://localhost:3000/admin
2. Find a member user
3. Change their role to "secretary"
4. Should see: "Role updated successfully. User should sign out and back in."

### Test 2: User Logs In with New Role
1. User signs out
2. User signs in again
3. User now has secretary role in Clerk
4. User can access http://localhost:3000/secretary
5. Navigation shows "Secretary Panel" link ✅

### Test 3: Verify Sync
Check both systems have the same role:
- **Supabase:** Check `users` table → `role` column
- **Clerk:** Check user's `publicMetadata.role`
- Both should match!

## Important Notes

### User Must Sign Out/In
After role change, user MUST:
1. Sign out completely
2. Sign back in
3. Clerk will then provide updated metadata

This is because:
- Clerk caches user metadata in the session
- Session is only refreshed on new sign-in
- We can't force refresh from backend

### Available Roles
- `admin` - Full access
- `finance` - Finance panel access
- `treasurer` - Treasurer panel access
- `secretary` - Secretary panel access
- `member` - Basic access

### Role-Based Access
The middleware (`proxy.ts`) checks Clerk's role to determine access:
```typescript
const role = user.publicMetadata?.role as string
if (route.requires === 'secretary' && role !== 'secretary' && role !== 'admin') {
  // Redirect to dashboard
}
```

## Files Modified

1. ✅ `app/api/admin/users/[id]/role/route.ts` - Added Clerk sync
2. ✅ `app/api/admin/users/[id]/status/route.ts` - Added Clerk sync
3. ✅ `app/admin/page.tsx` - Use API endpoints instead of direct Supabase
4. ✅ `app/dashboard/page.tsx` - Increased timeout to 10s

## Dashboard Timeout Fix

Also fixed the dashboard timeout error:
- **Before:** 5-second timeout, crashes on slow connection
- **After:** 10-second timeout, shows empty data gracefully if it fails
- Dashboard still works even if data fetch times out

## Summary

✅ **Role changes now sync to both Supabase AND Clerk**
✅ **User can access role-specific panels after sign-out/sign-in**
✅ **Dashboard handles timeouts gracefully**
✅ **Admin gets clear message to tell user to re-login**

---

**Fixed:** 2026-10-04
**Status:** Ready for testing
**Note:** Users must sign out and back in for role changes to take effect
