# 📋 Manual Storage Setup Guide (Dashboard Method)

## Issue: "new row violates row-level security policy"

This error means the bucket exists but RLS policies are blocking uploads.

---

## 🎯 Solution: Manual Setup via Dashboard

### Step 1: Go to Storage Section

1. Login to **Supabase Dashboard**
2. Select your project
3. Click **Storage** in the left sidebar

---

### Step 2: Check if 'receipts' Bucket Exists

- If you see 'receipts' bucket → Good! Go to Step 3
- If not → Create it:
  1. Click **"New bucket"**
  2. Name: `receipts`
  3. ✅ Check **"Public bucket"**
  4. Click **"Create bucket"**

---

### Step 3: Configure Bucket Policies (CRITICAL!)

1. Click on the **'receipts'** bucket
2. Click the **"Policies"** tab at the top
3. You'll see "No policies have been added yet"

#### Add Policy 1: INSERT (Upload)
1. Click **"New Policy"**
2. Click **"Create policy from scratch"**
3. Fill in:
   - **Policy name**: `Allow uploads to receipts`
   - **Allowed operation**: ✅ Check **INSERT**
   - **Policy definition**: Select **"With custom logic"**
   - In the text box, enter:
     ```sql
     bucket_id = 'receipts'
     ```
   - **Target roles**: Leave as default or select **public** and **authenticated**
4. Click **"Review"** then **"Save policy"**

#### Add Policy 2: SELECT (Read)
1. Click **"New Policy"** again
2. Click **"Create policy from scratch"**
3. Fill in:
   - **Policy name**: `Allow reads from receipts`
   - **Allowed operation**: ✅ Check **SELECT**
   - **Policy definition**: Select **"With custom logic"**
   - In the text box, enter:
     ```sql
     bucket_id = 'receipts'
     ```
   - **Target roles**: Leave as default or select **public** and **authenticated**
4. Click **"Review"** then **"Save policy"**

#### Add Policy 3: UPDATE (Optional)
1. Click **"New Policy"**
2. Click **"Create policy from scratch"**
3. Fill in:
   - **Policy name**: `Allow updates to receipts`
   - **Allowed operation**: ✅ Check **UPDATE**
   - **Policy definition**: `bucket_id = 'receipts'`
4. Click **"Review"** then **"Save policy"**

#### Add Policy 4: DELETE (Optional)
1. Click **"New Policy"**
2. Click **"Create policy from scratch"**
3. Fill in:
   - **Policy name**: `Allow deletes from receipts`
   - **Allowed operation**: ✅ Check **DELETE**
   - **Policy definition**: `bucket_id = 'receipts'`
4. Click **"Review"** then **"Save policy"**

---

### Step 4: Verify Configuration

1. Go back to **Storage** → **receipts** bucket
2. Click **"Upload file"** button
3. Try uploading a test image
4. If successful → Configuration is correct! ✅

---

## 🔍 Visual Checklist

### In Storage Dashboard, you should see:

```
Storage
├── receipts (public)
    ├── Policies (4 total)
    │   ├── ✅ Allow uploads to receipts (INSERT)
    │   ├── ✅ Allow reads from receipts (SELECT)
    │   ├── ✅ Allow updates to receipts (UPDATE)
    │   └── ✅ Allow deletes from receipts (DELETE)
    └── Files (uploaded payment proofs will appear here)
```

---

## 🧪 Test the Fix

### After setup, test as a member:

1. **Login as a member** (not admin)
2. Go to **Loans** page
3. Click on a disbursed loan
4. Click **"Make Payment"**
5. Fill in amount and select method
6. **Upload a payment proof image**
7. Click **"Submit Payment"**

### Expected Results:
- ✅ Upload progress shows
- ✅ "Payment proof uploaded successfully" message
- ✅ "Payment submitted successfully" message
- ✅ No errors in browser console

---

## ⚠️ Common Mistakes to Avoid

### ❌ Mistake 1: Bucket not set to Public
**Fix**: Edit bucket settings → Check "Public bucket"

### ❌ Mistake 2: Policies not added
**Fix**: Must add at least INSERT and SELECT policies

### ❌ Mistake 3: Wrong policy definition
**Fix**: Use exactly: `bucket_id = 'receipts'`

### ❌ Mistake 4: Wrong bucket name
**Fix**: Must be 'receipts' (lowercase, no spaces)

---

## 🔧 Alternative: Use SQL (If Dashboard Doesn't Work)

If the dashboard method fails, use SQL Editor:

```sql
-- Run this in SQL Editor:
DROP POLICY IF EXISTS "receipts_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "receipts_select_policy" ON storage.objects;

CREATE POLICY "receipts_insert_policy"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts_select_policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');
```

---

## 📊 Verification Queries

Run these in SQL Editor to verify:

```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'receipts';

-- Check policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%receipts%';
```

---

## 🎯 Success Criteria

### You're done when:
- ✅ Bucket shows as "public" in dashboard
- ✅ At least 2 policies visible (INSERT, SELECT)
- ✅ Test upload works in dashboard
- ✅ Member can upload payment proof without error
- ✅ No RLS policy violation errors

---

## 📞 Still Having Issues?

### Check these:

1. **User is logged in?**
   - Open browser console
   - Check Network tab for auth tokens

2. **Correct Supabase keys in .env.local?**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   ```

3. **Browser cache cleared?**
   - Hard refresh: Ctrl + Shift + R

4. **Try different browser?**
   - Test in incognito mode

---

## 🚀 Quick Summary

### The Fix (5 minutes):
1. Go to Supabase Dashboard → Storage
2. Find/Create 'receipts' bucket
3. Make it Public
4. Add INSERT and SELECT policies
5. Test upload
6. ✅ Done!

---

**Follow these steps carefully and the upload will work!** 🎉
