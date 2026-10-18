-- ==========================================
-- CREATE RECEIPTS STORAGE BUCKET
-- Fix for: "Failed to upload payment proof"
-- ==========================================

-- Step 1: Create receipts bucket
-- This is where payment proof images will be stored
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Set up storage policies for receipts bucket

-- Policy 1: Allow authenticated users to upload payment proofs
CREATE POLICY "Allow authenticated receipt uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Policy 2: Allow public read access to payment proofs
-- (So treasurers can view them for verification)
CREATE POLICY "Allow public receipt read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Policy 3: Allow authenticated users to update their receipts
CREATE POLICY "Allow authenticated receipt updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts');

-- Policy 4: Allow authenticated users to delete their receipts
CREATE POLICY "Allow authenticated receipt delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check if bucket was created successfully
SELECT * FROM storage.buckets WHERE id = 'receipts';

-- Check if policies were created successfully
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%receipt%';

-- ==========================================
-- EXPECTED RESULTS
-- ==========================================

-- Bucket query should return:
-- id: receipts
-- name: receipts
-- public: true

-- Policies query should return 4 policies:
-- 1. Allow authenticated receipt uploads (INSERT)
-- 2. Allow public receipt read (SELECT)
-- 3. Allow authenticated receipt updates (UPDATE)
-- 4. Allow authenticated receipt delete (DELETE)

-- ==========================================
-- USAGE
-- ==========================================

-- Members will upload payment proofs to:
-- receipts/payment_{loan_id}_{timestamp}.{extension}

-- Example filenames:
-- payment_123e4567_1699564800000.jpg
-- payment_987f6543_1699564900000.png

-- ==========================================
-- SUCCESS INDICATORS
-- ==========================================

-- After running this script:
-- ✅ Members can upload payment proofs
-- ✅ Treasurers can view uploaded proofs
-- ✅ System displays "Payment proof uploaded successfully"
-- ✅ No more "Failed to upload payment proof" errors

-- ==========================================
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR
-- ==========================================
