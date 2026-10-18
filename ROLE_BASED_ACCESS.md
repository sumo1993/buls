# Role-Based Access Control System

## User Roles & Permissions

### 1. **ADMIN** (Full Control)
**Access:** Everything

**Permissions:**
- ✅ View/manage all users
- ✅ Approve/reject user registrations
- ✅ Change user roles (member → finance → admin)
- ✅ Change user status (pending → active → graduated/dropped/transferred)
- ✅ Approve/reject all payments
- ✅ Approve/reject all loans
- ✅ View all financial data
- ✅ Access admin panel
- ✅ Access finance panel
- ✅ Submit own payments/loans

**Pages Access:**
- `/dashboard` - Personal dashboard
- `/admin` - User management panel
- `/finance` - Payment/loan approval panel
- `/payments` - Submit payments
- `/loans` - Request loans
- `/registration` - Complete profile

---

### 2. **FINANCE/MANAGEMENT** (Financial Control)
**Access:** Finance operations only

**Permissions:**
- ✅ Approve/reject all payments
- ✅ Approve/reject all loans
- ✅ View all financial transactions
- ✅ Access finance panel
- ✅ Submit own payments/loans
- ❌ Cannot manage users
- ❌ Cannot change roles
- ❌ Cannot access admin panel

**Pages Access:**
- `/dashboard` - Personal dashboard
- `/finance` - Payment/loan approval panel
- `/payments` - Submit payments
- `/loans` - Request loans
- `/registration` - Complete profile

---

### 3. **MEMBER/STUDENT** (Basic User)
**Access:** Personal transactions only

**Permissions:**
- ✅ Submit payment proofs
- ✅ Request loans
- ✅ View own payment history
- ✅ View own loan requests
- ✅ Update own profile
- ❌ Cannot approve/reject anything
- ❌ Cannot view other users' data
- ❌ Cannot access admin panel
- ❌ Cannot access finance panel

**Pages Access:**
- `/dashboard` - Personal dashboard
- `/payments` - Submit payments
- `/loans` - Request loans
- `/registration` - Complete profile

---

## User Status Flow

```
PENDING → ACTIVE → GRADUATED/TRANSFERRED/DROPPED
```

### Status Definitions:

1. **PENDING** - New registration, awaiting admin approval
   - Cannot submit payments/loans
   - Limited dashboard access
   - Shows "Pending Approval" message

2. **ACTIVE** - Approved member
   - Full access based on role
   - Can submit payments/loans
   - All features enabled

3. **GRADUATED** - Completed studies
   - Archive status
   - Historical records maintained
   - No new transactions allowed

4. **TRANSFERRED** - Moved to different institution
   - Archive status
   - Historical records maintained
   - No new transactions allowed

5. **DROPPED** - Left the union
   - Archive status
   - Historical records maintained
   - No new transactions allowed

---

## Role Hierarchy

```
ADMIN (Highest Authority)
  ↓
FINANCE/MANAGEMENT (Financial Authority)
  ↓
MEMBER/STUDENT (Basic User)
```

**Admin** can:
- Promote member → finance → admin
- Demote admin → finance → member
- Change any user status
- Override any decision

**Finance** can:
- Approve/reject financial requests
- View all financial data
- Cannot change user roles

**Member** can:
- Only manage own data
- Submit requests

---

## Database Schema

### Users Table
```sql
- id (UUID)
- clerk_id (TEXT) - From Clerk authentication
- email (TEXT)
- full_name (TEXT)
- role (ENUM: 'admin', 'finance', 'member')
- status (ENUM: 'pending', 'active', 'graduated', 'transferred', 'dropped')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Role Enum Values:
- `admin` - Full system control
- `finance` - Financial operations only
- `member` - Basic user access

### Status Enum Values:
- `pending` - Awaiting approval
- `active` - Approved and active
- `graduated` - Completed studies
- `transferred` - Moved away
- `dropped` - Left the union

---

## Access Control Implementation

All pages check user role:

```typescript
// Admin-only pages
if (userData.role !== 'admin') {
  router.push('/dashboard')
  return
}

// Finance or Admin pages
if (userData.role !== 'admin' && userData.role !== 'finance') {
  router.push('/dashboard')
  return
}

// Member pages - all logged-in users
// No special check needed
```

---

## How to Set User Role

### Option 1: Via Admin Panel (UI)
1. Login as admin
2. Go to `/admin`
3. Find user in table
4. Change role dropdown
5. Auto-saves

### Option 2: Via SQL (Direct)
```sql
UPDATE users 
SET role = 'admin', status = 'active'
WHERE clerk_id = 'user_xxxxx';
```

---

## Creating Your First Admin User

```sql
-- Run this in Supabase SQL Editor
INSERT INTO users (clerk_id, email, full_name, role, status)
VALUES (
  'YOUR_CLERK_USER_ID',
  'your.email@gmail.com',
  'Your Name',
  'admin',
  'active'
)
ON CONFLICT (clerk_id) DO UPDATE SET
  role = 'admin',
  status = 'active';
```

Replace `YOUR_CLERK_USER_ID` with your actual Clerk user ID from `/test-user` page.

---

## Testing Role-Based Access

1. **Test Admin Access:**
   - Login as admin user
   - Should see "Admin Panel" in sidebar
   - Can access `/admin` and `/finance`

2. **Test Finance Access:**
   - Change user role to `finance` in admin panel
   - Logout and login again
   - Should see "Finance Panel" in sidebar
   - Cannot access `/admin`

3. **Test Member Access:**
   - Change user role to `member`
   - Logout and login again
   - Should only see basic dashboard, payments, loans
   - Cannot access `/admin` or `/finance`

---

## Current Status

✅ **Working:**
- Browser-based Supabase connection
- Role-based access control
- Admin user management
- Finance approval system
- Member dashboard
- Payment submission
- Loan requests

⚠️ **Note:**
- Server-side Supabase calls don't work due to SSL/VPN issue
- All pages now use browser-based client which works perfectly
- Clerk webhook doesn't work (users must be created manually via SQL or admin panel)

---

## Quick Start Guide

1. **Create Admin User:**
   ```sql
   -- Get your Clerk ID from /test-user
   -- Run in Supabase SQL Editor
   INSERT INTO users (clerk_id, email, full_name, role, status)
   VALUES ('user_xxxxx', 'email@gmail.com', 'Name', 'admin', 'active');
   ```

2. **Login and Access Admin Panel:**
   - Go to `/admin`
   - Approve pending users
   - Assign roles

3. **Create Finance Users:**
   - In admin panel, change user role to `finance`
   - They can now access `/finance` panel

4. **Members Self-Register:**
   - New users register via Clerk
   - Complete profile at `/registration`
   - Status = `pending`
   - Admin approves in `/admin` panel
   - Status changes to `active`
   - Can now submit payments/loans

---

End of Documentation
