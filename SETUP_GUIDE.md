# LSUB Management System - Complete Setup Guide

This guide will walk you through setting up the entire system from scratch.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- A Supabase account (free tier is fine)
- A Clerk account (free tier is fine)

## Step 1: Clone and Install

```bash
cd lsub-management
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization and fill in project details
4. Wait for project to be created (~2 minutes)

### 2.2 Create Database Schema
1. In your Supabase project, go to "SQL Editor"
2. Click "New Query"
3. Copy the entire contents of `database/schema.sql`
4. Paste and click "Run"
5. You should see "Success. No rows returned"

### 2.3 Apply RLS Policies
1. Still in SQL Editor, click "New Query"
2. Copy the entire contents of `database/rls-policies.sql`
3. Paste and click "Run"
4. You should see "Success. No rows returned"

### 2.4 Get Supabase Keys
1. Go to Project Settings → API
2. Copy these values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Set Up Clerk

### 3.1 Create Application
1. Go to https://dashboard.clerk.com/
2. Click "Add application"
3. Name it "LSUB Beijing Management"
4. Select "Email" and "Phone" as sign-in options
5. Click "Create application"

### 3.2 Get Clerk Keys
1. In Clerk Dashboard, go to "API Keys"
2. Copy these values:
   - Publishable key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Secret key → `CLERK_SECRET_KEY`

### 3.3 Set Up Webhook
1. In Clerk Dashboard, go to "Webhooks"
2. Click "Add Endpoint"
3. For development, you need to expose your local server:
   - Install ngrok: `npm install -g ngrok`
   - Run: `ngrok http 3000`
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Endpoint URL: `https://abc123.ngrok.io/api/webhooks/clerk`
5. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
6. Click "Create"
7. Copy the "Signing Secret" → `CLERK_WEBHOOK_SECRET`

**For Production:** Use your actual domain instead of ngrok URL

## Step 4: Configure Environment Variables

Create `.env.local` file in the root:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/registration

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

## Step 5: Run the Application

```bash
npm run dev
```

Visit http://localhost:3000

## Step 6: Create First Admin User

1. Click "Get Started" or "Sign Up"
2. Create your account with email
3. You'll be redirected to complete your profile
4. Fill in all required information
5. Your account will be in "pending" status

6. Manually activate yourself as admin:
   - Go to Supabase Dashboard
   - Navigate to Table Editor → `users`
   - Find your user record (search by email)
   - Click to edit
   - Change `status` from `pending` to `active`
   - Change `role` from `member` to `admin`
   - Click "Save"

7. Refresh your browser
8. You now have full admin access!

## Step 7: Test the System

### Test User Registration
1. Open an incognito/private window
2. Sign up with a different email
3. Complete the profile
4. Notice the "Pending Approval" message
5. As admin, go to Admin Panel
6. Approve the new user
7. The user can now make payments and request loans

### Test Payment Flow
1. As a member, go to Payments
2. Click "New Payment"
3. Select month, amount, payment method
4. Upload a screenshot (any image for testing)
5. Submit - you'll receive a reference code like `LSUB-2026-09-0001`
6. Payment shows as "pending"
7. As Finance/Admin, go to Finance Panel
8. Review and approve the payment
9. Payment is now locked and marked as "paid"

### Test Loan Flow
1. As a member with all dues paid, go to Loans
2. Click "Request Loan"
3. Enter amount and reason
4. Submit
5. As Finance/Admin, go to Finance Panel
6. Review and approve the loan
7. Loan status changes to "approved"

### Test Loan Restriction
1. As a member, skip a month's payment
2. Try to request a loan
3. System blocks with message: "You have unpaid monthly dues"
4. Pay the missing month
5. Now you can request a loan

## Common Issues & Solutions

### Issue: Webhook not receiving events
**Solution:** 
- Make sure ngrok is running
- Check webhook URL matches ngrok URL
- Check webhook secret is correct
- Look at Clerk Dashboard → Webhooks → Logs for errors

### Issue: "User not found" after sign up
**Solution:**
- Check webhook is properly configured
- Check webhook logs in Clerk Dashboard
- Manually check Supabase `users` table

### Issue: "Row Level Security Policy Violation"
**Solution:**
- Make sure you ran `rls-policies.sql`
- Check you're signed in
- Check user has correct role/status

### Issue: Can't approve payments/loans
**Solution:**
- Check your role is `finance` or `admin`
- Check RLS policies are applied
- Check browser console for errors

### Issue: Reference code not showing
**Solution:**
- Check database function exists: `generate_reference_code`
- Check you ran `schema.sql` completely
- Check Supabase logs for errors

## Production Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Go to https://vercel.com
3. Import your GitHub repository
4. Add all environment variables
5. Update Clerk webhook URL to Vercel domain
6. Deploy!

### Environment Variables for Production
- Use production Clerk keys (not test keys)
- Use production Supabase keys
- Update webhook URL to production domain

## File Upload Configuration (Production)

The current implementation uses base64 encoding for file uploads, which works for development but is not recommended for production.

For production, set up Supabase Storage:

1. Go to Supabase Dashboard → Storage
2. Create a bucket called `payment-proofs`
3. Set up RLS policies for the bucket
4. Update upload logic in components to use Supabase Storage

Example upload code:
```typescript
const { data, error } = await supabase.storage
  .from('payment-proofs')
  .upload(`${userId}/${Date.now()}.jpg`, file)
```

## Security Checklist

- ✅ Environment variables not committed
- ✅ RLS policies enabled on all tables
- ✅ Webhook secret configured
- ✅ Service role key never exposed to client
- ✅ Admin approval required for new users
- ✅ Payment verification required
- ✅ Audit logs for sensitive actions

## Support

For technical support or questions:
- Email: tech@lsubbeijing.org
- GitHub Issues: [Your repo URL]

---

**Important Notes:**

1. Never commit `.env.local` to version control
2. Use different Clerk/Supabase projects for development and production
3. Regularly backup your Supabase database
4. Review audit logs periodically
5. Keep track of all admin actions

**Next Steps After Setup:**

1. Customize monthly due amount if needed (currently ¥100)
2. Set up email notifications (optional)
3. Configure file upload to cloud storage
4. Set up automated monthly payment reminders
5. Create data export functionality
6. Set up backup procedures

Good luck with your LSUB Beijing Management System! 🇱🇷🇨🇳
