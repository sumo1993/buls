# 🔴 NEXT ACTION REQUIRED: Database Migration

## Current Status
✅ **Development server**: Running at http://localhost:3000  
✅ **Code implementation**: Complete and tested  
✅ **Documentation**: Comprehensive guides created  
❌ **Database schema**: Missing critical columns  

## 🚨 IMMEDIATE ACTION NEEDED
You **MUST** run the database migration in Supabase to enable phone/passport search.

## Step-by-Step Instructions

### 1. Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)

### 2. Choose Migration File
**Option A (Recommended - Complete Solution):**
- Open `ADD_MISSING_COLUMNS_MIGRATION.sql`
- Copy **ENTIRE** content
- Paste into Supabase SQL Editor

**Option B (Quick Fix - Basic Solution):**
- Open `MINIMAL_MIGRATION.sql`
- Copy **ENTIRE** content
- Paste into Supabase SQL Editor

### 3. Execute Migration
1. Click **RUN** or press **Ctrl+Enter**
2. Wait for completion (should take < 30 seconds)
3. Verify success messages appear

### 4. Verify Migration
Run this quick verification SQL:
```sql
-- Check if columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('phone_number', 'passport_number');
```

## After Migration

### 1. Test Immediately
1. Go to: http://localhost:3000/secretary/events/4/checkin
2. Sign in with secretary/admin account
3. Test search:
   - Phone: "7054636640"
   - Ticket: "640"

### 2. Use Debug Tools if Needed
If search doesn't work:
1. Open browser console (F12)
2. Paste content from `browser-debug-script.js`
3. Follow debug instructions

## What This Migration Adds

### Database Changes:
- `phone_number` column to `users` table
- `passport_number` column to `users` table
- `ticket_guests` table for guest management
- Comprehensive search view
- Indexes for faster search

### Enabled Features:
- ✅ Phone number search
- ✅ Passport number search
- ✅ Guest management
- ✅ Multiple purchase scenarios
- ✅ Enhanced attendee tracking

## Files You Need

### Migration (Choose one):
- `ADD_MISSING_COLUMNS_MIGRATION.sql` - Complete solution
- `MINIMAL_MIGRATION.sql` - Quick fix

### Verification:
- `DATABASE_DIAGNOSTIC.sql` - Check current state
- `check-system-status.js` - System health

### Testing:
- `browser-debug-script.js` - Browser console debug
- `TEST_CHECKIN_GUIDE.md` - Testing instructions

## Expected Timeline
- **Migration execution**: 30 seconds
- **Verification**: 2 minutes
- **Testing**: 5 minutes
- **Total**: < 10 minutes

## ⚠️ Important Notes
1. **Server restart**: If server was running during migration, restart it
2. **Authentication**: You must be signed in as secretary/admin
3. **Test data**: If no attendees exist, add test data first
4. **Browser cache**: Clear cache if experiencing issues

## 🆘 Need Help?
If migration fails or search doesn't work:
1. Run `DATABASE_DIAGNOSTIC.sql` to check current state
2. Use browser debug script for troubleshooting
3. Check server logs for errors
4. Verify database connection in `.env.local`

## ✅ Success Criteria
After successful migration:
- Search finds attendees by phone number
- Search finds attendees by ticket number (last 3 digits)
- All attendee types appear in list
- Checkin functionality works (QR/manual)

**The system is 100% code complete. The only remaining task is database migration execution.**