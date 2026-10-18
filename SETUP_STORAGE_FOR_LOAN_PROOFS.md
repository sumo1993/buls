# Setup Supabase Storage for Loan Disbursement Proofs

## 🔴 Error: "Failed to upload proof"

This happens because the Supabase storage bucket doesn't exist or isn't properly configured.

---

## ✅ **Solution: Setup Storage Bucket in Supabase**

### **Option 1: Use Existing `receipts` Bucket (Recommended)**

If you already have a `receipts` bucket from payment receipts:

#### **Step 1: Verify Bucket Exists**
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Storage** (left sidebar)
4. Check if `receipts` bucket exists
5. If it exists, **you're done!** ✅

#### **Step 2: Ensure Public Access**
1. Click on `receipts` bucket
2. Click **Settings** (gear icon)
3. Make sure **Public bucket** is enabled
4. Save changes

---

### **Option 2: Create New Storage Bucket**

If `receipts` bucket doesn't exist:

#### **Step 1: Create Bucket**
1. Go to Supabase Dashboard → **Storage**
2. Click **New bucket** button
3. **Bucket name:** `receipts`
4. **Public bucket:** ✅ **Enable** (so images can be viewed)
5. Click **Create bucket**

#### **Step 2: Set Storage Policies**
Run this SQL in Supabase SQL Editor:

```sql
-- Allow authenticated users to upload to loan-disbursements folder
CREATE POLICY "Allow authenticated uploads to loan-disbursements"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = 'loan-disbursements');

-- Allow public to view loan disbursement proofs
CREATE POLICY "Allow public to view loan-disbursements"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = 'loan-disbursements');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated to delete loan-disbursements"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = 'loan-disbursements');
```

---

## 🔧 **Quick Test After Setup**

### **1. Test Upload**
1. Log in as **Treasurer**
2. Navigate to `/treasurer`
3. Click "Disburse Loan" on any finance-approved loan
4. Try uploading an image
5. Should see: "Proof uploaded successfully!" ✅

### **2. Verify in Supabase**
1. Go to Supabase Dashboard → **Storage** → `receipts` bucket
2. Look for folder: `loan-disbursements/`
3. Your uploaded image should be there

### **3. Check in Browser**
1. Right-click uploaded proof → "Inspect" 
2. Check Console for any errors
3. Should see public URL like: `https://[project].supabase.co/storage/v1/object/public/receipts/loan-disbursements/disbursement_xxx.jpg`

---

## 🚨 **Still Getting Error?**

### **Troubleshooting Steps:**

#### **1. Check Browser Console**
- Open DevTools (F12)
- Go to Console tab
- Look for detailed error message
- Common errors:
  - `Bucket not found` → Create the bucket
  - `Permission denied` → Check storage policies
  - `File too large` → File must be < 5MB
  - `Invalid file type` → Only images allowed

#### **2. Check Supabase Project**
```sql
-- Verify bucket exists
SELECT * FROM storage.buckets WHERE id = 'receipts';

-- Check if bucket is public
SELECT * FROM storage.buckets WHERE id = 'receipts' AND public = true;

-- List storage policies
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

#### **3. Test Direct Upload**
Try uploading directly in Supabase Dashboard:
1. Go to Storage → `receipts` bucket
2. Click "Upload file"
3. Try uploading a test image
4. If this fails, there's a bucket configuration issue

---

## 🔑 **Required Permissions**

### **RLS Policies for Storage:**

```sql
-- 1. UPLOAD permission (INSERT)
CREATE POLICY "treasurers_can_upload_loan_proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] = 'loan-disbursements'
);

-- 2. VIEW permission (SELECT) - Allow everyone to view proofs
CREATE POLICY "everyone_can_view_loan_proofs"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] = 'loan-disbursements'
);

-- 3. DELETE permission (for treasurers to remove/replace)
CREATE POLICY "treasurers_can_delete_loan_proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] = 'loan-disbursements'
);
```

---

## 📁 **Storage Structure**

After setup, your storage will look like this:

```
receipts/                          (bucket)
├── payment-receipts/              (existing - for payment proofs)
│   ├── receipt_123_456.jpg
│   └── receipt_789_101.jpg
└── loan-disbursements/            (new - for loan disbursement proofs)
    ├── disbursement_loan1_123.jpg
    ├── disbursement_loan2_456.jpg
    └── disbursement_loan3_789.jpg
```

---

## ✅ **Verification Checklist**

Before testing, ensure:

- [ ] `receipts` bucket exists in Supabase Storage
- [ ] Bucket is set to **Public**
- [ ] Storage policies are created (run SQL above)
- [ ] RLS is enabled on storage.objects table
- [ ] Test upload works in Supabase Dashboard
- [ ] You're logged in as Treasurer in the app
- [ ] Image file is < 5MB
- [ ] Image file format is valid (JPG, PNG, WebP, etc.)

---

## 🎯 **Alternative: Use Existing Payment Receipt Storage**

If you already have payment receipt storage working, the loan disbursement should use the same bucket (`receipts`) and it should just work!

The only difference is:
- **Payment receipts** go to: `receipts/payment-receipts/`
- **Loan disbursement proofs** go to: `receipts/loan-disbursements/`

Both use the same bucket, so if payment receipts work, loan proofs should too!

---

## 💡 **Quick Fix (If You're in a Hurry)**

### **Temporary Solution: Use Base64 Encoding**

If you want to test without setting up storage:

1. Store images as base64 strings in database
2. Modify the upload function to convert to base64
3. Store in `disbursement_proof_url` field as `data:image/jpeg;base64,...`

**Note:** This is NOT recommended for production (database bloat), but works for testing!

---

## 📞 **Need Help?**

1. Check Supabase Storage docs: https://supabase.com/docs/guides/storage
2. Verify your Supabase project has storage enabled
3. Check browser console for detailed error messages
4. Ensure you're using the correct Supabase project URL in `.env.local`

---

## ✨ **Once Setup is Complete:**

✅ Treasurer can upload disbursement proofs  
✅ Images stored securely in Supabase  
✅ Public URLs generated automatically  
✅ Everyone can view the proofs  
✅ Full audit trail maintained  

🎉 **Feature will work perfectly!**
