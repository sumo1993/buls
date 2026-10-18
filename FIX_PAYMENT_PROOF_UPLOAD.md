# 🔧 Fix: Payment Proof Upload Issue

## Problem
Members get "Failed to upload payment proof" error when trying to submit loan payments.

## Root Cause
The code is trying to upload to a storage bucket called `receipts` that either:
1. Doesn't exist in Supabase Storage
2. Doesn't have proper permissions configured

## Solution Options

### Option 1: Create 'receipts' Bucket (Recommended - Quick Fix)

Run this SQL in your Supabase SQL Editor:

```sql
-- Create receipts bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload receipts
CREATE POLICY "Allow authenticated receipt uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow public read access to receipts
CREATE POLICY "Allow public receipt read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Allow authenticated users to update receipts
CREATE POLICY "Allow authenticated receipt updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts');

-- Allow authenticated users to delete receipts
CREATE POLICY "Allow authenticated receipt delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');
```

### Option 2: Create via Supabase Dashboard

1. Go to Supabase Dashboard
2. Click **Storage** in left sidebar
3. Click **New bucket**
4. Enter name: `receipts`
5. Check **Public bucket**
6. Click **Create bucket**
7. Go to bucket → **Policies** tab
8. Add policies (see SQL above)

## Verify the Fix

### Test Upload:
1. Login as a member
2. Go to Loans page
3. Click on a disbursed loan
4. Click "Make Payment"
5. Fill in amount
6. Select payment method
7. Upload payment proof image
8. Submit payment

### Expected Result:
✅ "Payment proof uploaded successfully"
✅ "Payment submitted successfully"
✅ Payment appears in treasurer's verification queue

## Additional Notes

### File Upload Specs:
- **Bucket**: receipts
- **File types**: Images only (JPG, PNG, etc.)
- **Max size**: 5MB
- **Naming**: `payment_{loan_id}_{timestamp}.{ext}`
- **Access**: Public URL (anyone with link can view)

### Error Handling:
The code already includes:
- ✅ File type validation
- ✅ File size validation
- ✅ Error messages
- ✅ Loading states

### Security:
- Only authenticated users can upload
- Files are publicly readable (for treasurer verification)
- File names include timestamps for uniqueness

## Quick Test Script

After running the SQL, test with this:

1. **Check bucket exists:**
```sql
SELECT * FROM storage.buckets WHERE id = 'receipts';
```

2. **Check policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

## Status After Fix

✅ Bucket created
✅ Policies configured
✅ Members can upload payment proofs
✅ Treasurers can view proofs
✅ System works end-to-end

---

**Run the SQL script above and the upload issue will be resolved!** 🚀
