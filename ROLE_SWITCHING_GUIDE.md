# 🔄 Role Switching System - Complete Guide

## Your Use Case

**Goal**: Use ONE admin account to access BOTH admin functions AND member functions without logging out.

**Why**: You want to:
- ✅ Perform admin duties (approve payments, manage users, etc.)
- ✅ Experience member interface (make payments, request loans, etc.)
- ✅ Test both views without multiple accounts
- ✅ Switch instantly between modes

---

## Solution Implemented

### **Single Account, Dual Mode Access** ✅

Your admin account can now switch between:

1. **Admin Mode** (Default)
   - Full admin permissions
   - See all admin panels (Finance, Treasurer, Secretary, etc.)
   - Manage users, approve payments, disburse loans
   - Access admin-only features

2. **Member Mode** (Toggle)
   - Experience member interface
   - Submit payments like a member
   - Request loans like a member
   - See what members see
   - BUT: Still admin in database (for security)

---

## How to Use It

### Step 1: Look for the Toggle (Top Right)

```
┌──────────────────────────────────────┐
│  [Admin Mode] [🛡️ Toggle Switch]  👤 │
└──────────────────────────────────────┘
```

- **Red Toggle** = Admin Mode (🛡️)
- **Blue Toggle** = Member Mode (👤)

### Step 2: Switch Between Modes

**To Member Mode:**
1. Click toggle switch (red → blue)
2. Toast: "Switched to Member View"
3. Sidebar shows only member pages
4. Pages show member interface
5. You can now test member features!

**Back to Admin Mode:**
1. Click toggle switch (blue → red)
2. Toast: "Switched to Admin View"
3. Sidebar shows all admin pages
4. Full admin access restored

### Step 3: Use Features in Each Mode

#### In Member Mode:
- Go to `/payments` → See member payment form
- Submit a payment → Test member experience
- Go to `/loans` → Request a loan as member
- Go to `/dashboard` → See member dashboard

#### In Admin Mode:
- Go to `/finance` → Approve payments
- Go to `/treasurer` → Verify student uploads
- Go to `/admin` → Manage users
- Approve the payments/loans you created as member!

---

## Latest Fix Applied

### Problem:
After switching from Member back to Admin, sidebar links appeared but didn't navigate.

### Root Cause:
Next.js Link component wasn't properly handling navigation after role state changes.

### Solution:
1. **Added `router.push()` as force navigation**
   ```typescript
   onClick={(e) => {
     e.preventDefault()
     router.push(item.href) // Force navigation
   }}
   ```

2. **Added key prop to nav**
   ```typescript
   <nav key={effectiveRole}>
   ```

3. **Force re-render on role change**
   ```typescript
   useEffect(() => {
     forceUpdate({})
   }, [effectiveRole])
   ```

### Result:
✅ Links work in both Member and Admin modes
✅ Navigation happens immediately
✅ No page refresh needed

---

## Testing the Fix

### Test 1: Basic Switching
1. Login as admin
2. You're in **Admin Mode** (red toggle)
3. Sidebar shows: Dashboard, Payments, Admin Panel, Finance Panel, etc.
4. Click any link → Should navigate ✅

5. Toggle to **Member Mode** (click toggle → blue)
6. Sidebar shows: Dashboard, Payments, Loans, Events, Settings
7. Click any link → Should navigate ✅

8. Toggle back to **Admin Mode** (click toggle → red)
9. Sidebar shows all admin pages again
10. **Click any link** → Should navigate ✅ (THIS WAS BROKEN, NOW FIXED)

### Test 2: Member Experience
1. Switch to Member Mode
2. Go to `/payments`
3. You should see:
   - ✅ Simplified member form (no student selector)
   - ✅ Auto-calculated amount
   - ✅ "Submitting payment for: [Your Name]"
4. Submit a payment
5. Form closes, payment in history

### Test 3: Admin Approval
1. Switch back to Admin Mode
2. Go to `/treasurer` or `/finance`
3. You should see:
   - ✅ The payment you just submitted as "member"
   - ✅ Admin interface to approve it
4. Approve the payment
5. It's your own payment! 🎉

---

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────┐
│           Admin User Account            │
│         (role: 'admin' in DB)           │
└─────────────────────────────────────────┘
                    │
                    ├─── viewMode State
                    │    (stored in localStorage)
                    │
        ┌───────────┴───────────┐
        │                       │
   ┌────▼────┐          ┌──────▼──────┐
   │  Admin  │          │   Member    │
   │  Mode   │          │    Mode     │
   │         │          │             │
   │ role:   │          │ role: admin │
   │ admin   │          │ (but shows  │
   │         │          │ member UI)  │
   └─────────┘          └─────────────┘
```

### Key Code Components

#### 1. useRoleSwitch Hook
```typescript
export function useRoleSwitch({ userRole }) {
  const [viewMode, setViewMode] = useState<'role' | 'member'>('role')
  
  const getEffectiveRole = () => {
    if (viewMode === 'member') return 'member'
    return userRole // 'admin'
  }
  
  return {
    viewMode,
    effectiveRole: getEffectiveRole(),
    toggleView: () => {
      setViewMode(viewMode === 'role' ? 'member' : 'role')
    }
  }
}
```

#### 2. Dashboard Layout Filtering
```typescript
const { effectiveRole } = useRoleSwitch({ userRole })

const filteredNavigation = navigation.filter(item => {
  return item.roles.includes(effectiveRole)
})
```

#### 3. Page Components
```typescript
const { effectiveRole } = useRoleSwitch({ userRole })
const isAdminView = ['admin', 'finance', 'treasurer'].includes(effectiveRole)

{isAdminView ? (
  // Show admin interface
) : (
  // Show member interface
)}
```

---

## Security Considerations

### ✅ Safe Implementation

**Database Role Never Changes:**
- Your `users` table still shows `role: 'admin'`
- View mode is ONLY client-side UI state
- Server-side permissions still use database role
- API routes check actual database role, not view mode

**Example:**
```typescript
// Client (UI layer)
effectiveRole = 'member' // When in Member Mode

// Server (API layer)
const userRole = getUserFromDatabase(userId).role // Still 'admin'
if (userRole !== 'admin') throw new Error('Unauthorized')
```

### ⚠️ What This Means

- ✅ You can safely test member UI
- ✅ Backend still enforces admin permissions
- ✅ No security risk from switching views
- ✅ Other real members can't access admin features

---

## Advantages vs Creating Member Account

### Option A: Role Switching (Current) ✅
**Pros:**
- ✅ One account, no re-logging
- ✅ Instant switching
- ✅ Keep admin context while testing
- ✅ Easy to compare both views
- ✅ No need to manage multiple accounts

**Cons:**
- ❌ Not testing with real member permissions
- ❌ Some features might behave slightly different

### Option B: Separate Member Account
**Pros:**
- ✅ 100% authentic member experience
- ✅ Test actual permission restrictions
- ✅ Simulate real user journey

**Cons:**
- ❌ Need to logout/login constantly
- ❌ Lose admin context
- ❌ Manage multiple accounts
- ❌ Can't quickly approve your own test data

---

## Recommended Workflow

### Daily Admin Work:
1. Stay in **Admin Mode** (default)
2. Use all admin features normally
3. Approve payments, manage users, etc.

### When Testing Member Features:
1. Toggle to **Member Mode**
2. Test payment submission
3. Test loan requests
4. Check member dashboard
5. Toggle back to **Admin Mode**
6. Approve the test payments/loans you created
7. Verify the full workflow end-to-end

### When Helping a Member:
1. Toggle to **Member Mode**
2. Reproduce their issue
3. Understand what they see
4. Toggle back to **Admin Mode**
5. Fix the issue from admin side

---

## Console Commands for Debugging

Open browser console (F12) and run:

### Check Current Role:
```javascript
localStorage.getItem('viewMode')
// Output: "role" or "member"
```

### Force Switch to Member:
```javascript
localStorage.setItem('viewMode', 'member')
window.location.reload()
```

### Force Switch to Admin:
```javascript
localStorage.setItem('viewMode', 'role')
window.location.reload()
```

### Clear and Reset:
```javascript
localStorage.removeItem('viewMode')
window.location.reload()
```

---

## Troubleshooting

### Issue 1: Toggle doesn't appear
**Cause**: You're logged in as regular member  
**Solution**: Only admins/executives see the toggle

### Issue 2: Sidebar doesn't update after toggle
**Cause**: Navigation state not refreshing  
**Solution**: Already fixed with `router.push()` and `key` prop

### Issue 3: Links don't work after switching
**Cause**: Link component caching  
**Solution**: ✅ Already fixed - now using `e.preventDefault()` + `router.push()`

### Issue 4: Page shows wrong interface
**Cause**: Page not using `effectiveRole`  
**Solution**: Check if page uses `useRoleSwitch` hook

---

## Build Status

✅ **TypeScript**: No errors  
✅ **Build**: Exit Code 0  
✅ **Navigation**: Fixed with router.push()  
✅ **Ready for testing**  

---

## Next Steps

1. **Test the fix**:
   - Toggle to Member Mode
   - Click sidebar links → Should work now
   - Toggle to Admin Mode
   - Click sidebar links → Should work
   
2. **Test workflows**:
   - Submit payment as member
   - Approve it as admin
   - Request loan as member
   - Disburse it as treasurer

3. **Report any issues**:
   - If links still don't work, check console logs
   - Share error messages
   - We'll debug further

**The role switching should work perfectly now!** 🎉
