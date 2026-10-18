# Role Synchronization Test Guide

## Problem Summary
When admin changes a user's role from "member" to "secretary" (or finance/treasurer), the role updates in Supabase but doesn't sync to Clerk, preventing users from accessing role-specific panels.

## Fixes Applied

### 1. **Missing TypeScript Type** ✅
- **File**: `lib/types/database.ts`
- **Fix**: Added `'secretary'` to the `UserRole` type definition
- **Before**: `export type UserRole = 'admin' | 'finance' | 'treasurer' | 'member'`
- **After**: `export type UserRole = 'admin' | 'finance' | 'treasurer' | 'secretary' | 'member'`

### 2. **Missing State Declaration** ✅
- **File**: `app/admin/page.tsx`
- **Fix**: Added missing `selectedUserId` state declaration
- **Code**: `const [selectedUserId, setSelectedUserId] = useState<string>('')`

### 3. **Enhanced Logging** ✅
- **Files**: `app/admin/page.tsx`, `app/api/admin/users/[id]/role/route.ts`
- **Fix**: Added detailed console logging to track:
  - When `changeRole()` function is called
  - API request/response details
  - Clerk sync attempts and results
  - Error details

## Testing Steps

### Step 1: Start the Development Server
```bash
cd buls-main
npm run dev
```

### Step 2: Open Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Clear console for clean output

### Step 3: Test Role Change
1. Navigate to `/admin` page
2. Find a user with role "member"
3. Change their role to "secretary" using the dropdown
4. **Watch the console** for these logs:

#### Expected Frontend Logs:
```
🔄 changeRole called: {targetUserId: "xxx", newRole: "secretary"}
📡 Sending role update request...
📥 API response: {status: 200, data: {...}}
✅ Role update successful, refreshing data...
```

#### Expected Backend Logs (in terminal):
```
🔵 Role update API endpoint called
   Request from userId: user_xxx
   Target user ID: xxx
   New role requested: secretary
   Target user clerk_id: user_yyy
✅ Supabase updated successfully
🔄 Updating Clerk metadata for user user_yyy
   New role: secretary
   New status: active
✅ Synced role to Clerk successfully
   Clerk returned: {"role":"secretary","status":"active"}
```

### Step 4: Verify Role Sync
1. Navigate to `/test-role` page
2. Check if **Clerk Metadata** shows the new role
3. Expected result:
   - **Clerk Metadata > Role**: secretary
   - **Supabase Database > Role**: secretary
   - **Status**: ✅ SYNCED

### Step 5: Test Panel Access
1. Have the user **sign out** and **sign back in** (required for Clerk to refresh metadata)
2. After sign in, check if navigation shows:
   - "Secretary Panel" link in sidebar
3. Navigate to `/secretary` page
4. Should load without redirect

## Troubleshooting

### If logs don't appear:
- **Problem**: `changeRole()` not being called
- **Check**: Browser console for JavaScript errors
- **Verify**: Dropdown `onChange` event is firing
- **Test**: Add `console.log('Dropdown changed')` in onChange handler

### If API returns 401 Unauthorized:
- **Problem**: Not authenticated
- **Check**: User is signed in to Clerk
- **Verify**: `userId` is present in auth

### If API returns 403 Forbidden:
- **Problem**: Current user is not admin
- **Check**: Current user's role in Supabase is 'admin'

### If Clerk sync fails:
- **Problem**: Invalid CLERK_SECRET_KEY or network issue
- **Check**: `.env.local` has correct `CLERK_SECRET_KEY`
- **Verify**: Key starts with `sk_test_` or `sk_live_`
- **Test**: Check Clerk dashboard for API logs

### If role doesn't appear in Clerk metadata:
- **Problem**: User hasn't refreshed their Clerk session
- **Solution**: User must **sign out and sign back in**
- **Alternative**: Click "Reload Clerk User" button on `/test-role` page

### If "secretary" role shows as NOT SET:
- **Problem**: Clerk `publicMetadata` not updated
- **Check**: Backend logs for Clerk API errors
- **Verify**: Clerk API response includes the new role
- **Debug**: Check Clerk dashboard > Users > [user] > Metadata

## Success Criteria

✅ Console logs show API call is made
✅ Backend logs show Supabase update successful
✅ Backend logs show Clerk sync successful
✅ `/test-role` page shows matching roles after user refreshes
✅ User can access `/secretary` panel after signing back in
✅ Navigation sidebar shows "Secretary Panel" link

## Notes

1. **User must sign out and back in** for Clerk to refresh their session token with new metadata
2. The API endpoint updates **both Supabase AND Clerk** in a single call
3. All roles (admin, finance, treasurer, secretary, member) should work identically
4. The fix applies to both role changes AND status changes

## Files Modified

1. `lib/types/database.ts` - Added 'secretary' to UserRole type
2. `app/admin/page.tsx` - Added logging and fixed missing state
3. `app/api/admin/users/[id]/role/route.ts` - Enhanced logging
4. `components/DashboardLayout.tsx` - Already supported all roles ✅
5. `app/api/admin/users/[id]/role/route.ts` - Already validates all roles ✅

## Next Steps

If testing shows the API is being called but Clerk sync still fails:
1. Check Clerk API rate limits
2. Verify CLERK_SECRET_KEY permissions
3. Check Clerk dashboard for API error logs
4. Test with curl/Postman to isolate frontend vs backend
