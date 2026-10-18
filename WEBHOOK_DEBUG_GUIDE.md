# 🔍 Clerk Webhook Debugging Guide

## 🎯 Goal: Make Clerk Webhook Work Automatically

The webhook is failing because signature verification is not working. Let's debug this systematically.

## 📋 Step-by-Step Debugging Process

### Step 1: Verify Webhook Secret in Clerk Dashboard

1. **Go to Clerk Dashboard:** https://dashboard.clerk.com
2. **Navigate to Webhooks** → Click on your webhook
3. **Find the Signing Secret**
4. **Click "Reveal"** to see the full secret
5. **Copy the exact secret** (starts with `whsec_`)

**IMPORTANT:** The secret must match EXACTLY what's in your `.env.local`

### Step 2: Check Your Current .env.local Secret

Look at your current webhook secret:
```bash
grep CLERK_WEBHOOK_SECRET /Users/apple/Documents/BULS/lsub-management/.env.local
```

**Current secret:** `whsec_VlBikY2GkjY/CHtG/AMX2JDJg7g96to6`

### Step 3: Compare and Update if Needed

If the secret in Clerk Dashboard is different:
1. **Update .env.local** with the exact secret from Clerk
2. **No extra spaces or line breaks**
3. **Restart the development server**

### Step 4: Check Clerk Webhook Configuration

In Clerk Dashboard → Webhooks → Your Webhook:

**Verify these settings:**
- **Endpoint URL:** `https://chewy-smokeless-scratch.ngrok-free.dev/api/webhooks/clerk`
- **Events selected:**
  - ✅ `user.created`
  - ✅ `user.updated` (optional)
  - ✅ `user.deleted` (optional)
- **Status:** Active

### Step 5: Check Clerk Webhook Logs

In Clerk Dashboard → Webhooks → Your Webhook:

1. **Click "Recent attempts"** or "Logs"
2. **Look for recent webhook calls**
3. **Check the status:**
   - ✅ **200** = Success
   - ❌ **400** = Bad request (verification failed)
   - ❌ **500** = Server error

4. **Click on failed attempts** to see details:
   - Request payload
   - Response from your server
   - Error messages

### Step 6: Enable Detailed Logging

I've added extensive logging to the webhook endpoint. Now when Clerk sends a webhook:

**Check your server terminal for:**
```
=== WEBHOOK DEBUG START ===
Webhook secret exists: true
Webhook secret length: 35
Webhook secret preview: whsec_VlBikY2GkjY...
Svix headers: { svix_id: '...', svix_timestamp: '...', hasSignature: true }
Webhook payload type: object
Webhook body length: 1234
Attempting webhook verification...
Verification result type: object
Verification result: { type: 'user.created', data: {...} }
Webhook verified successfully. Event type: user.created
```

**If verification fails, you'll see:**
```
WEBHOOK VERIFICATION ERROR: Error: Invalid signature
Error details: {...}
```

### Step 7: Test Webhook Manually

#### Option A: Use Clerk's Test Feature
1. In Clerk Dashboard → Webhooks → Your Webhook
2. Click **"Test"** or **"Send test webhook"**
3. Select event type: `user.created`
4. Click **"Send"**
5. Check your server logs immediately

#### Option B: Create Real User
1. Create a new user in Clerk Dashboard
2. Watch your server logs for webhook processing
3. Check if user appears in Supabase

### Step 8: Check ngrok Interference

Sometimes ngrok can interfere with webhook headers:

**Test ngrok headers:**
```bash
curl -v https://chewy-smokeless-scratch.ngrok-free.dev/api/webhooks/clerk
```

**Look for:**
- Original headers preserved
- No ngrok-specific modifications to svix headers

## 🔧 Common Issues & Solutions

### Issue 1: Webhook Secret Mismatch
**Symptoms:** Verification fails with "Invalid signature"
**Solution:**
- Copy secret exactly from Clerk Dashboard
- No extra spaces or line breaks in `.env.local`
- Restart server after updating

### Issue 2: Ngrok URL Changed
**Symptoms:** Webhook endpoint not reachable
**Solution:**
- Check current ngrok URL: `curl -s http://localhost:4040/api/tunnels`
- Update webhook in Clerk if URL changed
- Consider ngrok paid tier for persistent URLs

### Issue 3: Clerk Webhook Not Configured
**Symptoms:** No webhook calls in server logs
**Solution:**
- Verify webhook is created in Clerk Dashboard
- Check endpoint URL is correct
- Ensure events are selected
- Check webhook is active

### Issue 4: Svix Headers Missing
**Symptoms:** "Error occurred -- no svix headers"
**Solution:**
- This means request didn't come from Clerk
- Webhook might be called from wrong source
- Check Clerk webhook configuration

## 🚀 Quick Debug Commands

```bash
# Run the debug helper script
./test-webhook-debug.sh

# Check ngrok status
curl -s http://localhost:4040/api/tunnels | jq

# Test webhook endpoint
curl -s -I https://chewy-smokeless-scratch.ngrok-free.dev/api/webhooks/clerk

# Check webhook secret
grep CLERK_WEBHOOK_SECRET .env.local
```

## 📊 Expected Successful Flow

When webhook works correctly:

1. **User created in Clerk**
2. **Clerk sends webhook** to your ngrok URL
3. **Your server receives webhook** with svix headers
4. **Signature verified** using webhook secret
5. **User created in Supabase** with role='member', status='pending'
6. **Success response** sent to Clerk (200)
7. **Clerk logs show success**

## 🎯 Success Criteria

✅ **Webhook is working when:**
- Server logs show "Webhook verified successfully"
- New Clerk users appear in Supabase automatically
- Clerk webhook logs show 200 status
- No verification errors in server logs

## 🔄 Next Steps After Debugging

### If It Works:
1. Test with multiple users
2. Test user updates and deletions
3. Monitor webhook logs regularly
4. Consider production deployment

### If It Still Fails:
1. Share the specific error from server logs
2. Share Clerk webhook logs
3. Check if ngrok is interfering
4. Consider alternative webhook setup

---

**Start with Step 1: Compare your webhook secret in Clerk Dashboard with your .env.local file. This is the most common issue.** 🔍
