# 🚀 Quick Start: Test Announcement Creation

## ⚡ Fastest Way to Test (3 Steps)

### Step 1: Start Your Server
```bash
cd c:\Users\dell\Documents\buls-main\buls-main
npm run dev
```

Wait until you see: `✓ Ready on http://localhost:3000`

### Step 2: Open the Test Tool

In your browser, go to:
```
http://localhost:3000/test-announcement.html
```

### Step 3: Run the Tests

Click these buttons in order:
1. **"Check My Status"** ← Start here
2. **"Create Test Announcement"** ← Then this
3. **"View Announcements"** ← Finally this

## 📱 Alternative: Use the Admin Page

If you prefer a UI:

1. Go to: `http://localhost:3000/admin/announcements`
2. Click **"New Announcement"**
3. Fill in:
   - **Title:** Welcome Message
   - **Content:** Welcome to BULS Beijing!
   - **Priority:** Normal
4. Click **"Create Announcement"**
5. Open browser console (F12) to see logs

## 🔍 What to Look For

### ✅ Success Signs:
- Green toast notification: "Announcement created!"
- Announcement appears in the list
- Console shows: `✅ Success:`

### ❌ Error Signs:
- Red toast notification with error message
- Console shows: `❌ Server error:`
- Check what the error says:

**Common Errors & Quick Fixes:**

| Error Message | Quick Fix |
|--------------|-----------|
| "User not found in database" | Go to `/admin/sync-clerk` and click "Sync All Users" |
| "Insufficient permissions" | Your role needs to be admin or secretary |
| "Unauthorized" | Log in first at `/sign-in` |
| "Missing required fields" | Fill in both title and content |

## 🛠️ Troubleshooting Commands

### Check if server is running:
```powershell
netstat -ano | findstr :3000
```
If you see `LISTENING`, server is running ✅

### View server logs:
Look at the terminal where you ran `npm run dev`

### Check database connection:
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM announcements;
```

### Verify your user exists:
```sql
-- In Supabase SQL Editor
SELECT clerk_id, email, role, status 
FROM users 
WHERE email = 'YOUR_EMAIL_HERE';
```

### Update your role to admin:
```sql
-- In Supabase SQL Editor
UPDATE users 
SET role = 'admin' 
WHERE email = 'YOUR_EMAIL_HERE';
```

## 📋 Pre-Test Checklist

Before testing, make sure:

- [ ] ✅ Dev server is running (`npm run dev`)
- [ ] ✅ You're logged in (visit `/sign-in` if not)
- [ ] ✅ Your email: _______________
- [ ] ✅ Your role is admin or secretary
- [ ] ✅ Browser console is open (press F12)

## 🎯 Testing Scenarios

### Test 1: Normal Priority Announcement
```
Title: "Weekly Meeting"
Content: "Join us for the weekly meeting this Friday at 3 PM"
Priority: normal
Expires: (leave empty)
```

### Test 2: Urgent Announcement
```
Title: "URGENT: Room Change"
Content: "Today's meeting moved to Room 305"
Priority: urgent
Expires: Tomorrow's date
```

### Test 3: High Priority with Expiration
```
Title: "Membership Dues Reminder"
Content: "Please pay your dues by end of month"
Priority: high
Expires: End of month
```

### Test 4: Low Priority
```
Title: "New Library Hours"
Content: "Library now open until 10 PM on weekdays"
Priority: low
Expires: (leave empty)
```

## 🔗 Essential URLs

| Page | URL | Purpose |
|------|-----|---------|
| Test Tool | `/test-announcement.html` | Debug & test API |
| Admin Page | `/admin/announcements` | Manage announcements |
| Public View | `/announcements` | See public view |
| Sync Users | `/admin/sync-clerk` | Sync Clerk users to DB |
| Sign In | `/sign-in` | Log in |

## 📸 What Success Looks Like

After creating an announcement, you should see:

**In the Admin Page:**
```
✅ Announcement created!

┌─────────────────────────────────────┐
│ Welcome Message         [NORMAL]    │
│ Welcome to BULS Beijing!            │
│ Created: Oct 5, 2026                │
└─────────────────────────────────────┘
```

**In Browser Console:**
```javascript
🔵 Submitting announcement: { method: 'POST', payload: {...} }
🔵 Response status: 201
✅ Success: { announcement: {...} }
```

**In Server Terminal:**
```
🔵 POST /api/announcements - Starting...
🔵 Clerk userId: user_2xxx...
🔵 User role: admin
✅ Announcement created successfully: 1
```

## 🚨 If All Else Fails

1. **Restart the dev server:**
   ```bash
   # Press Ctrl+C to stop
   npm run dev
   ```

2. **Clear browser cache:**
   - Press Ctrl+Shift+Delete
   - Clear cache and cookies
   - Refresh page

3. **Check environment variables:**
   Open `.env.local` and verify:
   - ✅ `NEXT_PUBLIC_SUPABASE_URL` is set
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` is set
   - ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set
   - ✅ `CLERK_SECRET_KEY` is set

4. **Verify database table:**
   Run `verify-announcements-table.sql` in Supabase

5. **Check user sync:**
   Go to `/admin/sync-clerk` and sync all users

## 💡 Pro Tips

- **Use the test tool first** - It gives the best error messages
- **Keep browser console open** - All errors are logged there
- **Watch the server terminal** - Server-side errors show there
- **Test with normal priority first** - It's the simplest test case
- **Don't set expiration on first test** - Keep it simple

## 📞 Need Help?

If you see an error:

1. Note the exact error message
2. Copy the browser console output (F12 → Console tab)
3. Copy the server terminal output
4. Check which step fails in the test tool

The error message will tell you exactly what's wrong!

---

## ⚡ TL;DR (Too Long; Didn't Read)

```bash
# 1. Start server
npm run dev

# 2. Open browser to:
http://localhost:3000/test-announcement.html

# 3. Click buttons and follow instructions

# That's it! 🎉
```
