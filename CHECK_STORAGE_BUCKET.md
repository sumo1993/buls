# Storage Bucket Issue - Payment Proof Not Loading

## Problem
Payment proof images are uploading but the URLs are returning errors when trying to display them.

**Error URL Example:**
```
https://jsvjdrnhvxlxzqhkijpj.supabase.co/storage/v1/object/public/receipts/payment_2ea425ee-f40a-4a4e-a3dd-732183dff4ec_1791751603418.png
```

## Root Cause
The Supabase Storage bucket 'receipts' either:
1. Doesn't have proper RLS (Row Level Security) policies
2. Isn't set to public
3. Files aren't actually being uploaded

## Fix Steps

### Option 1: Verify in Supabase Dashboard

1. **Go to Supabase Dashboard** → Storage
2. **Check 'receipts' bucket** exists
3. **Verify bucket is Public**:
   - Click on 'receipts' bucket
   - Check "Public bucket" is enabled
4. **Check uploaded files**:
   - Look for files named like `payment_xxx_timestamp.png`
   - If files exist but can't load, it's a permission issue
   - If no files exist, upload is failing

### Option 2: Run SQL to Fix Policies

Run this SQL in Supabase SQL Editor:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE name = 'receipts';

-- If bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "receipts_public_access" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete_policy" ON storage.objects;

-- Create simple public access policies
CREATE POLICY "receipts_public_access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

CREATE POLICY "receipts_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts')
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');
```

### Option 3: Make Bucket Public via Dashboard

1. **Supabase Dashboard** → Storage → receipts bucket
2. Click **Settings** (gear icon)
3. Enable **"Public bucket"**
4. Save changes

## Verify Fix

After applying the fix:

1. **Test upload** at http://localhost:3000/loans
2. **Click "Make Payment"**
3. **Upload an image**
4. **Check browser console**:
   - Should see: `✅ Payment proof uploaded: {...}`
   - Image should load (no error)
5. **Right-click image** → "Open in new tab"
   - If opens successfully = FIXED ✅
   - If shows error = Still an issue

## Alternative: Check Browser Network Tab

1. Open **DevTools** (F12)
2. Go to **Network** tab
3. Upload payment proof
4. Look for the image URL request
5. Check the **Status Code**:
   - `200` = Success (but might be CORS issue)
   - `403` = Permission denied (RLS policy issue)
   - `404` = File not found (upload failed)
   - `500` = Server error

## Quick Test SQL

Run this to see if files are being uploaded:

```sql
-- Check uploaded files
SELECT 
  name,
  bucket_id,
  created_at,
  metadata
FROM storage.objects 
WHERE bucket_id = 'receipts'
ORDER BY created_at DESC
LIMIT 10;
```

If files exist but URL doesn't work, it's definitely a permission/public access issue.

---

**Next Step**: Check Supabase Dashboard → Storage → receipts bucket settings!
