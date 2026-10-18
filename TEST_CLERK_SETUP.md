# Clerk Integration Test Guide

## Testing Steps

### 1. Open Browser
Go to: **http://localhost:3000**

### 2. Test Home Page
- [ ] Page loads without errors
- [ ] Navigation shows "Sign In" and "Sign Up" buttons
- [ ] No Clerk errors in browser console

### 3. Test Sign Up
1. Click "Sign Up" button
2. Clerk signup modal should appear
3. Create a test account:
   - Email: `test@example.com`
   - Password: `TestPassword123`
   - Click "Sign Up"
4. Expected results:
   - [ ] Account creation successful
   - [ ] Redirected to `/registration` page
   - [ ] No Clerk errors

### 4. Test Sign In
1. Sign out (if signed in)
2. Click "Sign In" button
3. Clerk signin modal should appear
4. Sign in with test account
5. Expected results:
   - [ ] Login successful
   - [ ] Redirected to `/dashboard`
   - [ ] User information shows in dashboard

### 5. Test Database Sync
Check Supabase after signup:
```sql
-- Check if user was created
SELECT * FROM users ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- clerk_id: (Clerk user ID)
-- email: test@example.com
-- role: member
-- status: pending
```

### 6. Test Gender Registration
1. After signing up, complete registration at `/registration`
2. Fill in the form:
   - Gender: Select "Female"
   - Other required fields
3. Submit form
4. Check database:
```sql
-- Check profile data
SELECT * FROM members_profile WHERE user_id = (user_id);

-- Should show:
-- gender: Female
```

### 7. Test Settings Page
1. Go to `/settings`
2. Update gender to "Male" or "Other"
3. Save changes
4. Check database updates

## Common Issues & Solutions

### Issue 1: Clerk SignIn/SignUp components not configured
**Error**: "The <SignIn/> component is not configured correctly"
**Solution**: Already fixed by:
- Added `routing="hash"` prop to SignIn and SignUp components
- Routes are catch-all: `/auth/signin/[[...signin]]` and `/auth/signup/[[...signup]]`

### Issue 2: Authentication middleware conflicts
**Error**: "Both middleware file and proxy file are detected"
**Solution**: Already fixed by:
- Using only `proxy.ts` (deleted `middleware.ts`)
- Updated `proxy.ts` to use Clerk authentication

### Issue 3: User not syncing to Supabase
**Cause**: Webhook not configured or not triggering
**Temporary solution**: Use manual sync:
```bash
# Or visit: http://localhost:3000/api/admin/sync-clerk-users
curl -X POST http://localhost:3000/api/admin/sync-clerk-users
```

## Verification Checklist

### Environment Setup
- [ ] `.env.local` file exists with Clerk keys
- [ ] Supabase keys configured
- [ ] Development server running at http://localhost:3000

### Clerk Authentication
- [ ] Home page loads without errors
- [ ] Sign In button works
- [ ] Sign Up button works
- [ ] Clerk modal appears correctly
- [ ] User can sign up successfully
- [ ] User can sign in successfully

### Database Integration
- [ ] User created in Supabase after signup
- [ ] `clerk_id` field populated
- [ ] Default role: `member`
- [ ] Default status: `pending`

### Gender Support
- [ ] Registration form shows gender dropdown
- [ ] Gender options: Male, Female, Other
- [ ] Gender saved to `members_profile` table
- [ ] Settings page allows gender updates

### Navigation
- [ ] Signed out users see "Sign In" and "Sign Up"
- [ ] Signed in users see "Dashboard"
- [ ] Protected routes redirect to signin when unauthorized

## Quick Test Commands

```bash
# Check if server is running
curl -I http://localhost:3000

# Check Clerk keys are loaded
curl http://localhost:3000/api/test-connection

# Manual user sync (if webhook not working)
curl -X POST http://localhost:3000/api/admin/sync-clerk-users
```

## Expected Outcomes

1. **Successful Sign Up**: User created in Clerk → webhook → Supabase
2. **Successful Sign In**: User authenticated by Clerk → session created
3. **Database Sync**: User data in Supabase with `clerk_id`
4. **Gender Data**: Gender stored in `members_profile` table
5. **Protected Routes**: Only authenticated users can access dashboard

The integration should now be fully functional and ready for testing!