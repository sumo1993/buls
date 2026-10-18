# Announcement Feature Test Guide

## Setup Complete ✅

I've created a complete announcement system with:

1. **API Routes** (`/app/api/announcements/route.ts`)
   - GET: Fetch all active announcements
   - POST: Create new announcement
   - PUT: Update existing announcement
   - DELETE: Delete announcement

2. **Admin Management Page** (`/app/admin/announcements/page.tsx`)
   - Full CRUD interface for managing announcements
   - Filter by priority
   - View active/expired announcements
   - Beautiful UI with priority badges

## How to Test

### Step 1: Access the Admin Page

1. Make sure your dev server is running (`npm run dev`)
2. Open your browser and go to: `http://localhost:3000/admin/announcements`
3. Make sure you're logged in as a user with **admin** or **secretary** role

### Step 2: Create an Announcement

1. Click the "New Announcement" button
2. Fill in the form:
   - **Title**: e.g., "Welcome to BULS Beijing"
   - **Content**: e.g., "We are excited to have you join our community!"
   - **Priority**: Choose from Low, Normal, High, or Urgent
   - **Expiration Date** (optional): Set a future date or leave empty for no expiration
3. Click "Create Announcement"

### Step 3: Check Browser Console

If you see "Failed to create announcement", open the browser console (F12) to see detailed error logs:

- Look for messages starting with 🔵 (info) or ❌ (errors)
- Common issues:
  - **"User not found"**: Your Clerk user might not be synced to the database
  - **"Insufficient permissions"**: You need admin or secretary role
  - **"Unauthorized"**: You're not logged in

### Step 4: Verify in Database

If creation succeeds, check the `announcements` table in Supabase:

```sql
SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5;
```

### Step 5: View on Public Page

Go to `http://localhost:3000/announcements` to see the announcement displayed to users.

## Troubleshooting

### Error: "User not found in database"

**Solution**: Sync your Clerk user to the database
1. Go to `http://localhost:3000/admin/sync-clerk`
2. Click "Sync All Users"

### Error: "Insufficient permissions"

**Solution**: Update your user role in the database
```sql
UPDATE users 
SET role = 'admin' 
WHERE clerk_id = 'your-clerk-user-id';
```

### Error: "Unauthorized"

**Solution**: Make sure you're logged in
1. Go to `http://localhost:3000/sign-in`
2. Log in with your credentials

### Error: Network or database connection issues

**Solution**: Check your environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` should be set
- `SUPABASE_SERVICE_ROLE_KEY` should be set
- Database should be accessible

## API Endpoints Reference

### GET /api/announcements
Fetch all active announcements (not expired)

**Response:**
```json
{
  "announcements": [
    {
      "id": 1,
      "title": "Welcome",
      "content": "Welcome message",
      "priority": "normal",
      "created_at": "2026-10-05T12:00:00Z",
      "expires_at": null
    }
  ]
}
```

### POST /api/announcements
Create a new announcement

**Request:**
```json
{
  "title": "Urgent Meeting",
  "content": "There is an urgent meeting today at 3 PM",
  "priority": "urgent",
  "expires_at": "2026-10-12T00:00:00Z"
}
```

**Response:**
```json
{
  "announcement": {
    "id": 2,
    "title": "Urgent Meeting",
    "content": "There is an urgent meeting today at 3 PM",
    "priority": "urgent",
    "created_by": "uuid-here",
    "created_at": "2026-10-05T12:00:00Z",
    "expires_at": "2026-10-12T00:00:00Z"
  }
}
```

### PUT /api/announcements
Update an existing announcement

**Request:**
```json
{
  "id": 2,
  "title": "Updated Title",
  "priority": "normal"
}
```

### DELETE /api/announcements?id=2
Delete an announcement

**Response:**
```json
{
  "success": true
}
```

## Next Steps

After successful testing:
1. Add navigation links to the admin announcements page
2. Consider adding email notifications for urgent announcements
3. Add rich text editor for better content formatting
4. Add file/image attachments support

## Debug Logs Location

Check these logs:
- **Browser Console**: F12 → Console tab
- **Server Terminal**: Where you ran `npm run dev`
- Look for 🔵, ✅, or ❌ emoji markers in logs
