# Quick Role Sync Test

## 🚀 Quick Start
```bash
cd buls-main
npm run dev
```

## ✅ Test Steps (2 minutes)

### 1. Open Browser Console (F12)
Press F12 → Go to Console tab

### 2. Change Role
1. Navigate to `http://localhost:3000/admin`
2. Find any user with role "member"
3. Use dropdown to change role to "secretary"

### 3. Watch Logs

#### ✅ Browser Console Should Show:
```
🔄 changeRole called: {targetUserId: "...", newRole: "secretary"}
📡 Sending role update request...
📥 API response: {status: 200, ...}
✅ Role update successful, refreshing data...
```

#### ✅ Terminal Should Show:
```
🔵 Role update API endpoint called
   New role requested: secretary
✅ Supabase updated successfully
🔄 Updating Clerk metadata for user ...
✅ Synced role to Clerk successfully
```

### 4. Verify Sync
Navigate to `http://localhost:3000/test-role`

**Expected:**
- Clerk Metadata: **secretary**
- Supabase Database: **secretary**
- Status: **✅ SYNCED**

### 5. Test Access
1. User signs out and back in
2. Check sidebar for "Secretary Panel" link
3. Visit `/secretary` page
4. Should load successfully ✅

## 🐛 If It Fails

### No logs appear:
→ Check browser console for JavaScript errors

### API returns 401:
→ Not signed in to Clerk

### API returns 403:
→ Current user is not admin

### Clerk sync fails:
→ Check `.env.local` has valid `CLERK_SECRET_KEY`

### Role not in Clerk metadata:
→ User must **sign out and sign back in**

## 📝 What Was Fixed

1. **Added 'secretary' to TypeScript type** (was missing!)
2. **Added missing state declaration** (selectedUserId)
3. **Added detailed logging** (see exactly what's happening)

## 🎯 Expected Result

All roles work identically:
- ✅ admin
- ✅ finance  
- ✅ treasurer
- ✅ secretary
- ✅ member

Role changes sync to both:
- ✅ Supabase database
- ✅ Clerk metadata

Users can access:
- ✅ Role-specific panels
- ✅ Navigation shows correct links
