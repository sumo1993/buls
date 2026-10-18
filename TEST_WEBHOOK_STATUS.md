# 🧪 Webhook Setup Status & Testing Guide

## ✅ Current Status

### Server Status
- ✅ **Development Server:** Running on `http://localhost:3000`
- ✅ **Ngrok Tunnel:** Active at `https://chewy-smokeless-scratch.ngrok-free.dev`
- ✅ **Webhook Secret:** Updated in `.env.local`
- ✅ **Webhook Endpoint:** Publicly accessible

### Configuration Status
- ✅ **Clerk Integration:** Working
- ✅ **Supabase Connection:** Working
- ✅ **Webhook Route:** Unprotected in proxy.ts
- ✅ **Environment Variables:** Updated with new webhook secret

## 🧪 How to Test the Webhook

### Option 1: Automatic Test (Recommended)
1. **Go to Clerk Dashboard:** https://dashboard.clerk.com
2. **Navigate to Users** → Click **"Create user"**
3. **Fill in user details** and click **"Create"**
4. **Wait 2-3 seconds** for webhook to process
5. **Check Supabase Dashboard:**
   - Go to Table Editor → `users` table
   - Look for the new user you just created
   - The user should appear with:
     - `clerk_id`: matching the Clerk user ID
     - `role`: 'member'
     - `status`: 'pending'

### Option 2: Check Server Logs
While creating a user in Clerk, watch your terminal for webhook messages:
```
Webhook processed
User created successfully
```

### Option 3: Manual Database Check
Run this SQL in Supabase SQL Editor:
```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;
```

## 📋 Expected Behavior

### When User Created in Clerk:
1. **Clerk** triggers `user.created` event
2. **Webhook** sends POST request to your ngrok URL
3. **Your server** validates the webhook signature
4. **Supabase** inserts new user record
5. **Response** sent back to Clerk

### User Record in Supabase:
```json
{
  "clerk_id": "user_abc123...",
  "full_name": "John Doe",
  "email": "john@example.com",
  "role": "member",
  "status": "pending",
  "created_at": "2026-09-29T..."
}
```

## 🔍 Troubleshooting

### User Not Appearing in Supabase
1. **Check Clerk Webhook Status:**
   - Go to Clerk Dashboard → Webhooks
   - Click on your webhook
   - Check for recent webhook attempts
   - Look for error messages

2. **Check Server Logs:**
   - Look for webhook processing errors
   - Check for Supabase connection errors
   - Verify webhook secret is correct

3. **Test Webhook Endpoint:**
   ```bash
   ./test-webhook-endpoint.sh
   ```

### Webhook Secret Issues
- Make sure the secret in `.env.local` matches Clerk exactly
- Restart server after updating the secret
- No extra spaces or line breaks in the secret

### Ngrok Connection Issues
- Verify ngrok is still running
- Check ngrok status: `curl -s http://localhost:4040/api/tunnels`
- Restart ngrok if connection drops

## 🎯 Next Steps After Testing

### If Webhook Works:
1. **Test user creation** with multiple users
2. **Verify user updates** (change name in Clerk, check Supabase)
3. **Test user deletion** (delete user in Clerk, check Supabase)
4. **Approve users** in your admin panel
5. **Test full user flow** from signup to active status

### If Webhook Doesn't Work:
1. Check Clerk webhook logs for errors
2. Verify ngrok tunnel is active
3. Check server logs for webhook processing
4. Test webhook endpoint manually
5. Verify environment variables

## 📞 Quick Reference

### Important URLs
- **Local Server:** http://localhost:3000
- **Ngrok Tunnel:** https://chewy-smokeless-scratch.ngrok-free.dev
- **Webhook Endpoint:** https://chewy-smokeless-scratch.ngrok-free.dev/api/webhooks/clerk
- **Clerk Dashboard:** https://dashboard.clerk.com
- **Supabase Dashboard:** https://supabase.com/dashboard

### Test Commands
```bash
# Test webhook endpoint
./test-webhook-endpoint.sh

# Check ngrok status
curl -s http://localhost:4040/api/tunnels | jq

# Test Supabase connection
curl -s http://localhost:3000/api/test-supabase

# Check server logs
# Watch terminal for webhook messages
```

## ✨ Success Criteria

✅ **Webhook is working when:**
- New Clerk users appear in Supabase automatically
- User updates in Clerk sync to Supabase
- Server logs show "User created successfully"
- No webhook errors in Clerk Dashboard

✅ **Setup is complete when:**
- All three events work: created, updated, deleted
- Users appear with correct role (member) and status (pending)
- Admin can approve users in the system
- Full user flow works end-to-end

---

**Ready to test! Create a new user in Clerk and check if it appears in Supabase.** 🚀
