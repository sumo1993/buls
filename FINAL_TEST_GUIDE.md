# FINAL TEST GUIDE: Phone & Passport Search

## 🎯 **What We've Implemented:**

### **Database Updates:**
1. ✅ Added `phone_number` and `passport_number` columns to `users` table
2. ✅ Copied real data from `members_profile` to `users` table
3. ✅ Test data with real passport numbers like `PP0867644`

### **API Updates:**
1. ✅ Fetches phone data from `members_profile.phone` (real data location)
2. ✅ Fetches passport data from `members_profile.passport_number`
3. ✅ Fallback to `users` table if needed
4. ✅ Returns complete attendee information

### **Checkin Page Updates:**
1. ✅ **Search by full passport number**: `PP0867644`
2. ✅ **Search by last 3 digits of passport**: `644`
3. ✅ **Search by full phone number**: (actual phone format)
4. ✅ **Search by last 3 digits of phone**: (last 3 digits)
5. ✅ **Search by name, email, ticket number**: (existing)

## 🚀 **How to Test Now:**

### **Step 1: Run the SQL to Sync Real Data**
Run this in Supabase SQL Editor:

```sql
-- Copy real data from members_profile to users table
UPDATE users u
SET 
  passport_number = mp.passport_number
FROM members_profile mp
WHERE u.id = mp.user_id
  AND mp.passport_number IS NOT NULL
  AND u.passport_number IS NULL;

UPDATE users u
SET 
  phone_number = mp.phone
FROM members_profile mp
WHERE u.id = mp.user_id
  AND mp.phone IS NOT NULL
  AND u.phone_number IS NULL;

-- Check what we have
SELECT 'Real passport numbers:' as item, COUNT(*) as count FROM users WHERE passport_number LIKE 'PP%';
SELECT 'Real phone numbers:' as item, COUNT(*) as count FROM users WHERE phone_number IS NOT NULL;
```

### **Step 2: Test on Checkin Page**
Go to: **http://localhost:3000/secretary/events/4/checkin**

#### **Test These Searches:**

**A. Passport Number Search:**
1. **Full passport**: `PP0867644` (from your data)
2. **Last 3 digits**: `644`
3. **Other passports**: `PP0343445` (last 3: `445`)

**B. Phone Number Search:**
1. **Full phone**: (check actual phone format from database)
2. **Last 3 digits**: (last 3 digits of phone)

**C. Other Searches:**
1. **Name**: "Admin" or "User"
2. **Email**: "admin@buls.org"
3. **Ticket number**: "640" (if tickets exist)

### **Step 3: Debug if Search Doesn't Work**

#### **Option A: Browser Console Debug**
Open browser console (F12 → Console) and run:

```javascript
// Quick API test
fetch('/api/event-registrations?eventId=4')
  .then(r => r.json())
  .then(data => {
    console.log('API Response:', data);
    console.log('Total attendees:', data.registrations?.length);
    
    if (data.registrations && data.registrations.length > 0) {
      // Check passport numbers
      const withPassport = data.registrations.filter(a => 
        a.passport_number && a.passport_number.startsWith('PP')
      );
      console.log('With PP passport:', withPassport.length);
      
      if (withPassport.length > 0) {
        console.log('Sample passports:', withPassport.map(a => a.passport_number).slice(0, 3));
        
        // Test search for "644"
        const searchTerm = '644';
        const matches = data.registrations.filter(a => {
          const passport = a.passport_number;
          return passport && (passport.includes(searchTerm) || passport.endsWith(searchTerm));
        });
        console.log(`Matches for "${searchTerm}":`, matches.length);
      }
    }
  });
```

#### **Option B: Check Database Directly**
Run in Supabase SQL Editor:

```sql
-- Check what attendees have for event 4
SELECT 
  u.full_name,
  u.passport_number,
  'Last 3: ' || RIGHT(u.passport_number, 3) as last_3_digits,
  u.phone_number,
  'Last 3: ' || RIGHT(REPLACE(u.phone_number, ' ', ''), 3) as phone_last_3
FROM users u
JOIN event_registrations er ON u.id = er.user_id
WHERE er.event_id = 4
  AND (u.passport_number IS NOT NULL OR u.phone_number IS NOT NULL)
LIMIT 10;
```

## 🔧 **Troubleshooting:**

### **Issue: "No results found" for passport search**
**Solution:**
1. Check API returns passport numbers starting with "PP"
2. Verify data was copied from `members_profile` to `users`
3. Try searching with last 3 digits only

### **Issue: Phone search not working**
**Solution:**
1. Check actual phone format in database
2. Try searching with spaces/without spaces
3. Try last 3 digits only

### **Issue: Page not updating search results**
**Solution:**
1. Clear browser cache (Ctrl+Shift+R)
2. Type search slowly
3. Click search button after typing

## 📋 **Expected Results:**

### **After Successful Implementation:**
- ✅ Search for `PP0867644` finds attendee
- ✅ Search for `644` (last 3 digits) finds same attendee
- ✅ Phone search works with actual phone numbers
- ✅ All 6+ attendees show in table

### **Search Capabilities:**
1. **Passport**: Full number AND last 3 digits
2. **Phone**: Full number AND last 3 digits  
3. **Ticket**: Full number AND last 3 digits
4. **Name/Email**: Existing functionality

## 🎉 **Final Verification:**

**Run this quick test sequence:**
1. Go to checkin page
2. Search: `PP0867644` → Should show results
3. Search: `644` → Should show same results
4. Search: Actual phone number → Should show results
5. Search: Last 3 digits of phone → Should show results

**The system now supports comprehensive search across ALL attendee information using real passport/phone formats!**