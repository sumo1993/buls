# Supabase Authentication Setup Guide

## Issue: "Missing email or phone" Error

This error occurs when Supabase email confirmation is required but not properly configured.

## Solution: Configure Supabase Authentication

### Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: `jsvjdrnhvxlxzqhkijpj`

### Step 2: Configure Email Authentication

1. In the left sidebar, click **Authentication**
2. Click **Providers**
3. Find **Email** in the list
4. Click to expand Email settings

### Step 3: Disable Email Confirmation (Recommended for Development)

**For Development/Testing:**
1. Scroll to **Email Confirmation** section
2. **Uncheck** "Enable email confirmation"
3. Click **Save**

This allows users to sign up and immediately sign in without email verification.

**For Production:**
Keep email confirmation enabled but ensure email templates are set up.

### Step 4: Configure Email Templates (If Email Confirmation Enabled)

1. Go to **Authentication** → **Email Templates**
2. Configure the **Confirm signup** template
3. Make sure the confirmation URL is set correctly:
   ```
   {{ .ConfirmationURL }}
   ```

### Step 5: Alternative - Disable Email Confirmation in Code

If you can't access Supabase dashboard, update the sign-up code to auto-confirm:

**Option A: Disable confirmation requirement** (needs Supabase dashboard access)
- Go to Authentication → Settings
- Turn off "Enable email confirmations"

**Option B: Use service role key** (for auto-confirming users)
This is not recommended for production but works for testing.

## Current Setup

Your Supabase project: `https://jsvjdrnhvxlxzqhkijpj.supabase.co`

### Environment Variables (Already Set)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://jsvjdrnhvxlxzqhkijpj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

## Quick Test: Disable Email Confirmation

### In Supabase Dashboard:

1. **Authentication** → **Settings** → **User Signups**
2. Find **Enable email confirmations**
3. **Toggle OFF** (disable)
4. Click **Save**

### Expected Behavior After Disabling:

✅ User signs up with email/password
✅ User is immediately signed in (no email verification needed)
✅ User can access the app right away
✅ Redirected to `/registration` page

## Test the Authentication Flow

### With Email Confirmation Disabled:

1. Go to http://localhost:3000
2. Click "Sign Up"
3. Fill in the form
4. Submit
5. Should immediately redirect to `/registration` page
6. Complete profile
7. Access dashboard

### With Email Confirmation Enabled:

1. Go to http://localhost:3000
2. Click "Sign Up"
3. Fill in the form
4. Submit
5. Check your email for confirmation link
6. Click the link
7. Redirected to `/auth/callback`
8. Then to `/registration` page
9. Complete profile
10. Access dashboard

## Troubleshooting

### Error: "Missing email or phone"

**Cause**: Supabase is configured to require phone OR email, but only email is provided.

**Solution**:
1. Go to Supabase Dashboard
2. Authentication → Settings
3. Ensure "Enable phone confirmations" is OFF
4. Ensure "Enable email confirmations" is either:
   - OFF (for development) - easiest
   - ON with proper email templates configured

### Error: "Email link is invalid or has expired"

**Cause**: The confirmation link expired (default 24 hours)

**Solution**:
1. Request a new confirmation email
2. Or disable email confirmation for development

### Error: "User already registered"

**Cause**: Email is already in the auth.users table

**Solution**:
1. Go to Supabase Dashboard
2. Authentication → Users
3. Find and delete the test user
4. Try signing up again

## Recommended Settings for Development

```
Authentication → Settings:

✅ Enable email provider
❌ Enable email confirmations (OFF for development)
❌ Enable phone confirmations (OFF)
✅ Enable password authentication
❌ Require email verification on password change (OFF for development)
```

## Recommended Settings for Production

```
Authentication → Settings:

✅ Enable email provider
✅ Enable email confirmations (ON for security)
❌ Enable phone confirmations (OFF unless needed)
✅ Enable password authentication
✅ Require email verification on password change
```

## Email Templates Setup (Production)

If you enable email confirmation, configure these templates:

### 1. Confirm Signup Template

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

### 2. Magic Link Template

```html
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .TokenHash }}">Log In</a></p>
```

### 3. Change Email Address Template

```html
<h2>Confirm Change of Email</h2>
<p>Follow this link to confirm the update of your email:</p>
<p><a href="{{ .TokenHash }}">Change Email</a></p>
```

## Alternative: Use Magic Link (No Password)

Instead of email/password, you can use magic links:

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
})
```

This sends a one-time login link to the user's email.

## Next Steps

1. **Disable email confirmation** in Supabase Dashboard (easiest for testing)
2. **Test sign up** - should work immediately
3. **Enable email confirmation later** when ready for production
4. **Configure email templates** for production use

## Need Help?

Check Supabase Auth documentation:
https://supabase.com/docs/guides/auth/auth-email
