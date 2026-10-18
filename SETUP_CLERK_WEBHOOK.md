# 🔗 Setup Clerk Webhook for User Sync

## Problem
Clerk users are not automatically created in Supabase because the webhook is not configured.

## Solution
Set up Clerk webhook to automatically sync users to Supabase when they are created.

## Step-by-Step Instructions

### 1. Your Ngrok Tunnel is Running ✅
- **Public URL:** `https://chewy-smokeless-scratch.ngrok-free.dev`
- **Local Server:** `http://localhost:3000`
- **Status:** Active and ready

### 2. Configure Clerk Webhook

#### Step 1: Go to Clerk Dashboard
1. Visit: https://dashboard.clerk.com
2. Select your application: **open-liger-2227**
3. Go to **Webhooks** in the left sidebar

#### Step 2: Create New Webhook
1. Click **"Add webhook"** or **"Create webhook"**
2. **Endpoint URL:** `https://chewy-smokeless-scratch.ngrok-free.dev/api/webhooks/clerk`
3. **Description:** `Supabase User Sync`

#### Step 3: Select Events
Subscribe to these events:
- ✅ `user.created` (Required - creates user in Supabase)
- ✅ `user.updated` (Optional - updates user info)
- ✅ `user.deleted` (Optional - removes user from Supabase)

#### Step 4: Get Webhook Secret
1. After creating the webhook, click on it
2. Find **"Signing Secret"** or **"Webhook Secret"**
3. Click **"Reveal"** or **"Copy"**
4. Copy the secret (starts with `whsec_`)

#### Step 5: Update Environment Variables
Open your `.env.local` file and add/update:

```env
CLERK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

Replace `whsec_YOUR_WEBHOOK_SECRET_HERE` with the actual secret you copied.

#### Step 6: Restart Development Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 3. Test the Webhook

#### Automatic Test (Recommended)
1. **Create a new test user** in Clerk:
   - Go to Clerk Dashboard → Users
   - Click **"Create user"**
   - Fill in the details and save
2. **Check Supabase:**
   - Go to Supabase Dashboard → Table Editor → `users`
   - You should see the new user appear automatically

#### Manual Test (Optional)
1. The webhook will trigger automatically when you create a user
2. Check your server logs for webhook processing messages
3. Look for: `User created successfully` in the logs

### 4. Verify User Sync

#### Check Supabase Database
```sql
-- Run this in Supabase SQL Editor
SELECT * FROM users ORDER BY created_at DESC;
```

You should see all Clerk users appearing automatically.

#### Check Server Logs
Look for these messages in your terminal:
- `Webhook processed`
- `User created successfully`
- `User updated successfully`

## Troubleshooting

### Webhook Not Triggering
- ✅ Make sure ngrok is still running
- ✅ Check the webhook URL in Clerk matches: `https://chewy-smokeless-scratch.ngrok-free.dev/api/webhooks/clerk`
- ✅ Verify the webhook secret is correct in `.env.local`

### User Not Created in Supabase
- ✅ Check server logs for errors
- ✅ Verify Supabase connection is working
- ✅ Make sure the `users` table exists in Supabase

### Ngrok URL Changed
- Ngrok free tier changes URLs on restart
- Update the webhook URL in Clerk if ngrok restarts
- Consider upgrading ngrok for persistent URLs

## Important Notes

### For Development
- Keep ngrok running while developing
- The webhook only works when ngrok is active
- Restart ngrok if the tunnel disconnects

### For Production
- Replace ngrok URL with your actual domain
- Example: `https://your-domain.com/api/webhooks/clerk`
- Update webhook in Clerk when deploying

### Webhook Security
- The webhook secret validates requests from Clerk
- Never share your webhook secret
- Keep it in `.env.local` (not committed to git)

## Current Status

✅ **Ngrok Tunnel:** Active (`https://chewy-smokeless-scratch.ngrok-free.dev`)
✅ **Webhook Endpoint:** Publicly accessible
✅ **Server:** Running on localhost:3000
⏳ **Clerk Webhook:** Needs configuration (follow steps above)

## Next Steps

1. Configure Clerk webhook with the ngrok URL
2. Add webhook secret to `.env.local`
3. Restart development server
4. Create a test user in Clerk
5. Verify user appears in Supabase automatically

Once configured, **all future Clerk users will automatically sync to Supabase!** 🎉
